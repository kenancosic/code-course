"""add practice room and challenge domain

Revision ID: 1f2e3d4c5b6a
Revises: c4d9a6a3e2f1
Create Date: 2026-03-30 18:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1f2e3d4c5b6a"
down_revision: Union[str, None] = "c4d9a6a3e2f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "practice_challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("path_id", sa.Integer(), nullable=True),
        sa.Column("topic_id", sa.Integer(), nullable=True),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("language", sa.String(length=32), nullable=False),
        sa.Column("difficulty", sa.String(length=16), nullable=False),
        sa.Column("challenge_kind", sa.String(length=16), nullable=False),
        sa.Column("entrypoint_name", sa.String(length=100), nullable=False),
        sa.Column("starter_code", sa.Text(), nullable=False),
        sa.Column("solution_code", sa.Text(), nullable=True),
        sa.Column("xp_reward", sa.Integer(), nullable=False),
        sa.Column("visible_tests", sa.JSON(), nullable=False),
        sa.Column("hidden_tests", sa.JSON(), nullable=False),
        sa.Column("hints", sa.JSON(), nullable=False),
        sa.Column("examples", sa.JSON(), nullable=False),
        sa.Column("constraints", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("source_prompt", sa.Text(), nullable=True),
        sa.Column("grounding_context", sa.JSON(), nullable=True),
        sa.Column("ai_generated", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.ForeignKeyConstraint(["path_id"], ["roadmap_paths.id"]),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_practice_challenges_id"), "practice_challenges", ["id"], unique=False)

    op.create_table(
        "practice_rooms",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("floor_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("language", sa.String(length=32), nullable=False),
        sa.Column("difficulty", sa.String(length=16), nullable=False),
        sa.Column("selected_subtopic", sa.String(length=150), nullable=True),
        sa.Column("practice_goal", sa.Text(), nullable=True),
        sa.Column("attempt_tokens", sa.Integer(), nullable=False),
        sa.Column("max_attempt_tokens", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("boss_defeated", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["floor_id"], ["roadmap_nodes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "practice_encounters",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("room_id", sa.String(), nullable=False),
        sa.Column("challenge_id", sa.Integer(), nullable=False),
        sa.Column("encounter_order", sa.Integer(), nullable=False),
        sa.Column("encounter_type", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("attempts_used", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["challenge_id"], ["practice_challenges.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["practice_rooms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "practice_submissions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("room_id", sa.String(), nullable=False),
        sa.Column("encounter_id", sa.String(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=32), nullable=False),
        sa.Column("stdout", sa.Text(), nullable=True),
        sa.Column("stderr", sa.Text(), nullable=True),
        sa.Column("exit_code", sa.Integer(), nullable=False),
        sa.Column("execution_time_ms", sa.Integer(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("visible_results", sa.JSON(), nullable=True),
        sa.Column("hidden_results", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["encounter_id"], ["practice_encounters.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["practice_rooms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("practice_submissions")
    op.drop_table("practice_encounters")
    op.drop_table("practice_rooms")
    op.drop_index(op.f("ix_practice_challenges_id"), table_name="practice_challenges")
    op.drop_table("practice_challenges")
