# Custom Superset image with PostgreSQL support
# The official Apache Superset image doesn't include psycopg2 by default
FROM apache/superset:latest

USER root

# Install PostgreSQL driver into Superset's virtual environment
# Use system pip but target the venv's site-packages
RUN pip install --no-cache-dir --target=/app/.venv/lib/python3.10/site-packages psycopg2-binary

USER superset
