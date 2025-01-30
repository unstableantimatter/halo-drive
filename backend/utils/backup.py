import os
import shutil
import sqlite3
from datetime import datetime
import json
from pathlib import Path
import gzip

class DatabaseBackup:
    def __init__(self, db_path, backup_dir):
        self.db_path = Path(db_path)
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def create_backup(self, note=None):
        """Create a backup of the database"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"backup_{timestamp}.db.gz"
        backup_path = self.backup_dir / backup_name
        metadata_path = self.backup_dir / f"backup_{timestamp}.json"

        # Ensure we have a consistent backup using SQLite's backup API
        try:
            # Connect to source database
            source = sqlite3.connect(self.db_path)
            # Create backup in memory first
            memory_db = sqlite3.connect(':memory:')
            source.backup(memory_db)
            source.close()

            # Write to compressed file
            with gzip.open(backup_path, 'wb') as gz_file:
                for line in memory_db.iterdump():
                    gz_file.write(f'{line}\n'.encode('utf-8'))
            
            memory_db.close()

            # Save metadata
            metadata = {
                'timestamp': timestamp,
                'original_path': str(self.db_path),
                'size': os.path.getsize(self.db_path),
                'note': note,
                'tables': self._get_table_info()
            }

            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

            return backup_path, metadata

        except Exception as e:
            if backup_path.exists():
                backup_path.unlink()
            if metadata_path.exists():
                metadata_path.unlink()
            raise RuntimeError(f"Backup failed: {str(e)}")

    def restore_backup(self, backup_path):
        """Restore database from backup"""
        backup_path = Path(backup_path)
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        # Create temporary database
        temp_db = self.db_path.parent / f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        
        try:
            # Decompress and restore backup
            conn = sqlite3.connect(temp_db)
            cursor = conn.cursor()
            
            with gzip.open(backup_path, 'rt') as gz_file:
                for line in gz_file:
                    cursor.execute(line)
            
            conn.commit()
            conn.close()

            # Verify the restored database
            self._verify_restored_db(temp_db)

            # Replace the current database
            if self.db_path.exists():
                # Create a rollback backup
                rollback_path = self.backup_dir / f"rollback_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
                shutil.copy2(self.db_path, rollback_path)

            # Replace the current database with the restored one
            shutil.move(temp_db, self.db_path)

            return True

        except Exception as e:
            if temp_db.exists():
                temp_db.unlink()
            raise RuntimeError(f"Restore failed: {str(e)}")

    def list_backups(self):
        """List available backups with their metadata"""
        backups = []
        for backup_file in self.backup_dir.glob('backup_*.db.gz'):
            metadata_file = self.backup_dir / f"{backup_file.stem}.json"
            if metadata_file.exists():
                with open(metadata_file) as f:
                    metadata = json.load(f)
                    backups.append({
                        'file': backup_file.name,
                        'metadata': metadata
                    })
        return sorted(backups, key=lambda x: x['metadata']['timestamp'], reverse=True)

    def _get_table_info(self):
        """Get information about database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        tables = {}
        for table in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'"):
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            tables[table_name] = {
                'row_count': row_count
            }
        
        conn.close()
        return tables

    def _verify_restored_db(self, db_path):
        """Verify the restored database integrity"""
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check database integrity
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()
        if result[0] != "ok":
            raise RuntimeError("Database integrity check failed")
        
        # Verify all tables are present
        original_tables = set(self._get_table_info().keys())
        restored_tables = set()
        for table in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'"):
            restored_tables.add(table[0])
        
        if original_tables != restored_tables:
            raise RuntimeError("Restored database is missing tables")
        
        conn.close()