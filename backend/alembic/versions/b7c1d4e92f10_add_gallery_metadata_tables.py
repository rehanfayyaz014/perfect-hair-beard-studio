"""add gallery metadata tables

Revision ID: b7c1d4e92f10
Revises: daecda683792
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c1d4e92f10"
down_revision: Union[str, None] = "daecda683792"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "gallery_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("display_order >= 0", name="ck_gallery_categories_display_order_non_negative"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_gallery_categories_name"),
        sa.UniqueConstraint("slug", name="uq_gallery_categories_slug"),
    )
    op.create_table(
        "gallery_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("asset_path", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=True),
        sa.Column("caption", sa.String(length=500), nullable=True),
        sa.Column("alt_text", sa.String(length=255), nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("display_order >= 0", name="ck_gallery_items_display_order_non_negative"),
        sa.ForeignKeyConstraint(["category_id"], ["gallery_categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("asset_path", name="uq_gallery_items_asset_path"),
    )
    op.create_index(op.f("ix_gallery_items_category_id"), "gallery_items", ["category_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_gallery_items_category_id"), table_name="gallery_items")
    op.drop_table("gallery_items")
    op.drop_table("gallery_categories")
