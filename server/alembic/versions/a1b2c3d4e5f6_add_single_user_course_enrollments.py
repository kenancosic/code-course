"""add single-user course enrollments

Revision ID: a1b2c3d4e5f6
Revises: 1f2e3d4c5b6a
Create Date: 2026-03-31 15:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "1f2e3d4c5b6a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _get_or_create_current_profile_id(conn: sa.Connection) -> int:
    user_profiles = sa.table(
        "user_profiles",
        sa.column("id", sa.Integer()),
        sa.column("display_name", sa.String()),
        sa.column("avatar_seed", sa.String()),
        sa.column("total_xp", sa.Integer()),
        sa.column("level", sa.Integer()),
        sa.column("current_path_id", sa.Integer()),
    )
    profile_id = conn.execute(
        sa.select(user_profiles.c.id).order_by(user_profiles.c.id.asc()).limit(1)
    ).scalar_one_or_none()
    if profile_id is not None:
        return int(profile_id)

    conn.execute(
        user_profiles.insert().values(
            id=1,
            display_name="Adventurer",
            avatar_seed="Felix",
            total_xp=0,
            level=1,
            current_path_id=None,
        )
    )
    return 1


def upgrade() -> None:
    op.create_table(
        "course_enrollments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_course_enrollments_user_course"),
    )
    op.create_index(op.f("ix_course_enrollments_id"), "course_enrollments", ["id"], unique=False)

    with op.batch_alter_table("user_progress") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_user_progress_user_id_user_profiles", "user_profiles", ["user_id"], ["id"])

    with op.batch_alter_table("user_achievements") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_user_achievements_user_id_user_profiles", "user_profiles", ["user_id"], ["id"])

    conn = op.get_bind()
    current_profile_id = _get_or_create_current_profile_id(conn)

    conn.execute(
        sa.text("UPDATE user_progress SET user_id = :user_id WHERE user_id IS NULL"),
        {"user_id": current_profile_id},
    )
    conn.execute(
        sa.text("UPDATE user_achievements SET user_id = :user_id WHERE user_id IS NULL"),
        {"user_id": current_profile_id},
    )
    conn.execute(
        sa.text(
            "UPDATE roadmap_paths SET user_id = :user_id "
            "WHERE is_custom = 1 AND user_id IS NULL"
        ),
        {"user_id": current_profile_id},
    )

    courses = sa.table(
        "courses",
        sa.column("id", sa.Integer()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("total_lessons", sa.Integer()),
    )
    user_progress = sa.table(
        "user_progress",
        sa.column("user_id", sa.Integer()),
        sa.column("course_id", sa.Integer()),
        sa.column("completed_at", sa.DateTime(timezone=True)),
    )
    course_enrollments = sa.table(
        "course_enrollments",
        sa.column("user_id", sa.Integer()),
        sa.column("course_id", sa.Integer()),
        sa.column("started_at", sa.DateTime(timezone=True)),
        sa.column("last_accessed_at", sa.DateTime(timezone=True)),
        sa.column("completed_at", sa.DateTime(timezone=True)),
    )

    existing_courses = conn.execute(
        sa.select(
            courses.c.id,
            courses.c.created_at,
            courses.c.total_lessons,
        ).order_by(courses.c.id.asc())
    ).all()

    for course_id, created_at, total_lessons in existing_courses:
        progress_row = conn.execute(
            sa.select(
                sa.func.max(user_progress.c.completed_at),
                sa.func.count(user_progress.c.course_id),
            ).where(
                sa.and_(
                    user_progress.c.user_id == current_profile_id,
                    user_progress.c.course_id == course_id,
                )
            )
        ).one()
        latest_completed_at, completed_count = progress_row
        completed_at = None
        if total_lessons and completed_count >= total_lessons:
            completed_at = latest_completed_at

        conn.execute(
            course_enrollments.insert().values(
                user_id=current_profile_id,
                course_id=course_id,
                started_at=created_at,
                last_accessed_at=latest_completed_at or created_at,
                completed_at=completed_at,
            )
        )

    with op.batch_alter_table("user_progress") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_unique_constraint("uq_user_progress_user_lesson", ["user_id", "lesson_id"])

    with op.batch_alter_table("user_achievements") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_unique_constraint(
            "uq_user_achievements_user_achievement",
            ["user_id", "achievement_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("user_achievements") as batch_op:
        batch_op.drop_constraint("uq_user_achievements_user_achievement", type_="unique")
        batch_op.drop_constraint("fk_user_achievements_user_id_user_profiles", type_="foreignkey")
        batch_op.drop_column("user_id")

    with op.batch_alter_table("user_progress") as batch_op:
        batch_op.drop_constraint("uq_user_progress_user_lesson", type_="unique")
        batch_op.drop_constraint("fk_user_progress_user_id_user_profiles", type_="foreignkey")
        batch_op.drop_column("user_id")

    op.drop_index(op.f("ix_course_enrollments_id"), table_name="course_enrollments")
    op.drop_table("course_enrollments")
