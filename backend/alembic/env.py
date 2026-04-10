from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Import app settings and SQLAlchemy base/models so Alembic can detect schema changes
from backend.config import settings
from backend.database import Base
from backend.models import User, FeeItem, Payment, PaymentReview, Notification  # noqa: F401

# Alembic Config object — provides access to values in alembic.ini
config = context.config

# Override the database URL from app settings instead of alembic.ini
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

# Set up Python logging using the config file, if one is specified
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Tell Alembic which metadata to compare against when generating migrations
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without an active database connection.

    Emits the migration SQL to stdout (or a file) rather than executing it.
    Useful for generating SQL scripts to review or apply manually.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,          # Render bind parameters inline in the SQL
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live database connection.

    Creates an engine from the config, opens a connection, and applies
    any pending migrations inside a transaction.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # No connection pooling — each migration gets a fresh connection
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


# Entry point: choose offline or online mode based on how Alembic was invoked
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
