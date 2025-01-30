# Space Racing Game

A multiplayer space racing game built with Python Flask and modern web technologies.

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd space-racing-game
```

2. Start the game server:
```bash
python backend/manage.py
```

The server will automatically:
- Set up the required directory structure
- Install dependencies
- Configure the database
- Open the game in your default browser

## Requirements

- Python 3.7 or higher
- PostgreSQL database
- Modern web browser with WebSocket support

## Installation

### Automatic Setup

The management script handles all setup automatically:
```bash
python backend/manage.py
```

### Manual Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Configure the database:
   - Copy `backend/config.example.py` to `backend/config.py`
   - Update database credentials in `config.py`

3. Initialize the database:
```bash
python backend/manage.py --force-migrate
```

## Server Management

The game server includes a comprehensive management system through `backend/manage.py`.

### Basic Commands

Start development server (with auto-reload):
```bash
python backend/manage.py
```

Start production server:
```bash
python backend/manage.py --no-debug
```

Run system checks:
```bash
python backend/manage.py --check-only
```

Force database migration:
```bash
python backend/manage.py --force-migrate
```

### Management Features

- Automatic dependency installation
- Database migration handling
- Directory structure verification
- Performance optimization settings
- Development/Production mode toggle

## Project Structure

```
space-racing-game/
├── backend/
│   ├── app.py              # Flask application
│   ├── config.py           # Configuration
│   ├── manage.py           # Management script
│   ├── models/             # Database models
│   │   ├── user.py
│   │   └── race_history.py
│   ├── migrations/         # Database migrations
│   ├── utils/             # Utility modules
│   │   ├── __init__.py
│   │   ├── backup.py      # Database backup utilities
│   │   ├── db_utils.py    # Database optimization utilities
│   │   └── db_optimizations.py  # SQLite optimizations
│   └── static/            # Backend static files
├── frontend/
│   ├── static/
│   │   ├── css/          # Stylesheets
│   │   │   ├── main.css
│   │   │   ├── particles.css
│   │   │   └── settings.css
│   │   └── js/           # JavaScript files
│   │       ├── effects.js
│   │       ├── particle-config.js
│   │       └── settings-ui.js
│   └── templates/        # HTML templates
└── requirements.txt      # Python dependencies
```

## Features

### Game Features
- Multiplayer racing
- Real-time particle effects
- Dynamic race tracks
- Player rankings
- Race history tracking

### Technical Features
- WebSocket-based multiplayer
- Particle system with quality settings
- Automatic performance optimization
- Database migration system
- Development tools

## Configuration

### Quality Settings

The game includes automatic quality detection and can be manually configured through the in-game settings panel:

- Ultra: Full effects and physics
- High: Balanced effects and performance
- Medium: Reduced effects
- Low: Minimal effects for low-end devices

Access the settings panel using the gear icon in the top-right corner.

### Database Configuration

Database settings can be configured in `backend/config.py`:

```python
SQLALCHEMY_DATABASE_URI = 'postgresql://username:password@localhost/dbname'
```

## Development

### Running Tests
```bash
# TODO: Add test commands
```

### Code Style
Follow PEP 8 for Python code and use ESLint for JavaScript.

## Troubleshooting

### Common Issues

1. Database Connection Errors
   - Verify database credentials in config.py
   - Ensure PostgreSQL is running
   - Try forcing a migration: `python backend/manage.py --force-migrate`

2. Missing Dependencies
   - Run `python backend/manage.py --check-only` to verify all dependencies
   - Check Python version (3.7+ required)

3. Performance Issues
   - Lower quality settings in-game
   - Check browser console for warnings
   - Monitor server logs for issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add License Information]

## Database Setup

The game uses SQLite for data storage, which means no additional database setup is required. The database file will be automatically created at `backend/database/space_racing.db` when you first run the server.

### Database Commands

1. Force new migration:
```bash
python backend/manage.py --force-migrate
```

2. Reset database:
Simply delete the `backend/database/space_racing.db` file and run:
```bash
python backend/manage.py --force-migrate
```

### Database Location

The SQLite database is stored in:
```
backend/database/space_racing.db
```

You can back up your game data by simply copying this file.

### Database Backup and Restore

Create a backup:
```bash
python backend/manage.py --backup
```

Add a note to your backup:
```bash
python backend/manage.py --backup --backup-note "Before major update"
```

List available backups:
```bash
python backend/manage.py --list-backups
```

Restore from backup:
```bash
python backend/manage.py --restore backup_20240101_120000.db.gz
```

Backups are stored in `backend/database/backups/` with metadata about each backup.
A rollback backup is automatically created when restoring, in case you need to undo
the restore operation.

### Python Environment Setup

#### Using Conda (Recommended)

1. Create a new conda environment:
```bash
conda create -n space-racing python=3.9
conda activate space-racing
```

2. Install PostgreSQL dependencies:
```bash
conda install -c conda-forge psycopg2
conda install -c conda-forge pywin32  # Windows only
```

3. Install Python packages:
```bash
python backend/manage.py  # This will install required packages automatically
```

#### Using pip (Alternative)

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Database Configuration

1. Copy the example config:
```bash
cp backend/config.example.py backend/config.py
```

2. Edit `backend/config.py` with your database credentials:
```python
# Default settings (change if needed):
DB_USER = 'postgres'
DB_PASSWORD = 'postgres'  # Use the password you set during PostgreSQL installation
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'space_racing'
```

### Troubleshooting PostgreSQL

#### Common Issues

1. **Service Not Running**
   - Windows:
     ```
     # Open Services app (services.msc)
     # Find "PostgreSQL" service
     # Right-click -> Start
     ```
   - Linux:
     ```bash
     sudo systemctl status postgresql
     sudo systemctl start postgresql
     ```
   - macOS:
     ```bash
     brew services restart postgresql
     ```

2. **Connection Refused**
   - Check if PostgreSQL is running:
     ```bash
     # Windows
     pg_isready -U postgres
     
     # Linux/macOS
     pg_isready
     ```
   - Verify port is correct:
     ```bash
     netstat -an | findstr "5432"  # Windows
     netstat -an | grep "5432"     # Linux/macOS
     ```

3. **Authentication Failed**
   - Reset postgres user password:
     ```bash
     # Windows
     psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'new_password';"
     
     # Linux
     sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'new_password';"
     ```
   - Update config.py with new password

4. **Database Doesn't Exist**
   ```bash
   # Connect as postgres user
   psql -U postgres
   
   # Create database
   CREATE DATABASE space_racing;
   
   # Verify database exists
   \l
   ```

5. **Permission Issues**
   ```sql
   -- Grant all privileges to postgres user
   ALTER USER postgres WITH SUPERUSER;
   ```

### Verifying Setup

Run the management script with check-only flag:
```bash
python backend/manage.py --check-only
```

This will verify:
- PostgreSQL installation
- Database connection
- Required tables
- Migrations status

If everything passes, start the server:
```bash
python backend/manage.py
```

### Development Database Commands

1. Force new migration:
```bash
python backend/manage.py --force-migrate
```

2. Reset database:
```sql
-- In psql:
DROP DATABASE space_racing;
CREATE DATABASE space_racing;
```

Then run:
```bash
python backend/manage.py --force-migrate
```