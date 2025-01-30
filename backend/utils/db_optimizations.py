from contextlib import contextmanager
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

def optimize_sqlite(app, db):
    """Configure SQLite optimizations"""
    
    # Enable WAL mode for better concurrent access
    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            
            # Write-Ahead Logging for better concurrency
            cursor.execute("PRAGMA journal_mode=WAL")
            
            # Memory-mapped I/O for better performance
            cursor.execute("PRAGMA mmap_size=30000000000")
            
            # Optimize for speed over durability
            cursor.execute("PRAGMA synchronous=NORMAL")
            
            # Increase cache size (in pages)
            cursor.execute("PRAGMA cache_size=-2000")  # ~2MB cache
            
            # Enable memory-mapped I/O for temp files
            cursor.execute("PRAGMA temp_store=MEMORY")
            
            cursor.close()

    @contextmanager
    def bulk_operations():
        """Context manager for bulk operations"""
        connection = db.engine.connect()
        transaction = connection.begin()
        
        try:
            # Start transaction
            cursor = connection.connection.cursor()
            cursor.execute("BEGIN TRANSACTION")
            
            # Temporarily disable some constraints for speed
            cursor.execute("PRAGMA foreign_keys=OFF")
            cursor.execute("PRAGMA journal_mode=MEMORY")
            
            yield connection
            
            # Re-enable constraints
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            
            # Commit transaction
            transaction.commit()
            
        except:
            transaction.rollback()
            raise
        finally:
            connection.close()

    # Add optimization utilities to app context
    app.bulk_operations = bulk_operations 