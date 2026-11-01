from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class GalleryCategory(Base):
    __tablename__ = "gallery_categories"
    __table_args__ = (
        UniqueConstraint("name", name="uq_gallery_categories_name"),
        UniqueConstraint("slug", name="uq_gallery_categories_slug"),
        CheckConstraint("display_order >= 0", name="ck_gallery_categories_display_order_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list[GalleryItem]] = relationship(back_populates="category")


class GalleryItem(Base):
    __tablename__ = "gallery_items"
    __table_args__ = (
        CheckConstraint("display_order >= 0", name="ck_gallery_items_display_order_non_negative"),
        UniqueConstraint("asset_path", name="uq_gallery_items_asset_path"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("gallery_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    asset_path: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(String(160), nullable=True)
    caption: Mapped[str | None] = mapped_column(String(500), nullable=True)
    alt_text: Mapped[str] = mapped_column(String(255), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[GalleryCategory] = relationship(back_populates="items")
