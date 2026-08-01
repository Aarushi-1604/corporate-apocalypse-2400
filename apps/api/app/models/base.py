from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """
    Every model in this project inherits from this class. Alembic's
    autogenerate needs this to discover all tables.

    NAMING_CONVENTION matters more than it looks: without it, Postgres
    auto-generates constraint names like `players_prn_key` with no
    guaranteed pattern. With it, every constraint gets a predictable
    name (e.g. `uq_players_prn`), which matters later when Alembic
    needs to reference a specific constraint to modify or drop it --
    without predictable names, autogenerate sometimes can't tell two
    schema states apart correctly.
    """
    metadata = MetaData(naming_convention=NAMING_CONVENTION)