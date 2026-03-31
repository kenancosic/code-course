"""add grimoire ingestion and projection support

Revision ID: c4d9a6a3e2f1
Revises: f5e9d3d0b4e8
Create Date: 2026-03-28 14:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d9a6a3e2f1"
down_revision: Union[str, None] = "f5e9d3d0b4e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "source_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_format", sa.String(length=20), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("detected_title", sa.String(length=255), nullable=True),
        sa.Column("detected_author", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("processing_metadata", sa.JSON(), nullable=True),
        sa.Column("processing_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_source_documents_id"), "source_documents", ["id"], unique=False)
    op.create_index(op.f("ix_source_documents_checksum_sha256"), "source_documents", ["checksum_sha256"], unique=False)

    op.create_table(
        "document_sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_document_id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("depth", sa.Integer(), nullable=True),
        sa.Column("page_start", sa.Integer(), nullable=True),
        sa.Column("page_end", sa.Integer(), nullable=True),
        sa.Column("char_start", sa.Integer(), nullable=True),
        sa.Column("char_end", sa.Integer(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("keywords", sa.JSON(), nullable=True),
        sa.Column("suggested_path_id", sa.Integer(), nullable=True),
        sa.Column("suggested_topic_id", sa.Integer(), nullable=True),
        sa.Column("suggested_tier", sa.Integer(), nullable=True),
        sa.Column("match_confidence", sa.Float(), nullable=True),
        sa.Column("match_rationale", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["parent_id"], ["document_sections.id"]),
        sa.ForeignKeyConstraint(["source_document_id"], ["source_documents.id"]),
        sa.ForeignKeyConstraint(["suggested_path_id"], ["roadmap_paths.id"]),
        sa.ForeignKeyConstraint(["suggested_topic_id"], ["topics.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_document_sections_id"), "document_sections", ["id"], unique=False)

    with op.batch_alter_table("courses") as batch_op:
        batch_op.add_column(sa.Column("source_document_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("generation_mode", sa.String(length=20), nullable=True))
        batch_op.alter_column("topic_id", existing_type=sa.Integer(), nullable=True)
        batch_op.create_foreign_key("fk_courses_source_document_id", "source_documents", ["source_document_id"], ["id"])

    with op.batch_alter_table("lessons") as batch_op:
        batch_op.add_column(sa.Column("source_section_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_lessons_source_section_id", "document_sections", ["source_section_id"], ["id"])

    with op.batch_alter_table("topics") as batch_op:
        batch_op.add_column(sa.Column("source_document_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("source_section_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_topics_source_document_id", "source_documents", ["source_document_id"], ["id"])
        batch_op.create_foreign_key("fk_topics_source_section_id", "document_sections", ["source_section_id"], ["id"])

    with op.batch_alter_table("roadmap_nodes") as batch_op:
        batch_op.add_column(sa.Column("source_document_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("source_section_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_roadmap_nodes_source_document_id", "source_documents", ["source_document_id"], ["id"])
        batch_op.create_foreign_key("fk_roadmap_nodes_source_section_id", "document_sections", ["source_section_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("roadmap_nodes") as batch_op:
        batch_op.drop_constraint("fk_roadmap_nodes_source_section_id", type_="foreignkey")
        batch_op.drop_constraint("fk_roadmap_nodes_source_document_id", type_="foreignkey")
        batch_op.drop_column("source_section_id")
        batch_op.drop_column("source_document_id")

    with op.batch_alter_table("topics") as batch_op:
        batch_op.drop_constraint("fk_topics_source_section_id", type_="foreignkey")
        batch_op.drop_constraint("fk_topics_source_document_id", type_="foreignkey")
        batch_op.drop_column("source_section_id")
        batch_op.drop_column("source_document_id")

    with op.batch_alter_table("lessons") as batch_op:
        batch_op.drop_constraint("fk_lessons_source_section_id", type_="foreignkey")
        batch_op.drop_column("source_section_id")

    with op.batch_alter_table("courses") as batch_op:
        batch_op.drop_constraint("fk_courses_source_document_id", type_="foreignkey")
        batch_op.alter_column("topic_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("generation_mode")
        batch_op.drop_column("source_document_id")

    op.drop_index(op.f("ix_document_sections_id"), table_name="document_sections")
    op.drop_table("document_sections")

    op.drop_index(op.f("ix_source_documents_checksum_sha256"), table_name="source_documents")
    op.drop_index(op.f("ix_source_documents_id"), table_name="source_documents")
    op.drop_table("source_documents")
