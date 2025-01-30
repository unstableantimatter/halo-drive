from apscheduler.schedulers.background import BackgroundScheduler
from backend.socket_events import cleanup_inactive_games as cleanup

def init_scheduler(app):
    """Initialize the background scheduler with app context"""
    scheduler = BackgroundScheduler()
    
    def cleanup_with_context():
        """Wrapper to provide app context for cleanup job"""
        with app.app_context():
            cleanup()
    
    # Add jobs with the context wrapper
    scheduler.add_job(
        func=cleanup_with_context,
        trigger='interval',
        seconds=30,
        id='cleanup_inactive_games',
        replace_existing=True
    )
    
    # Start the scheduler
    scheduler.start()
    return scheduler 