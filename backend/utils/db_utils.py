import time
from functools import wraps
from sqlalchemy.exc import OperationalError, IntegrityError

def with_retry(max_retries=3, delay=0.1):
    """Decorator to retry database operations on failure"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return f(*args, **kwargs)
                except (OperationalError, IntegrityError) as e:
                    retries += 1
                    if retries == max_retries:
                        raise e
                    time.sleep(delay * retries)
            return None
        return wrapper
    return decorator

def optimize_query(query):
    """Add query optimizations"""
    return query.execution_options(
        compiled_cache=True
    ).enable_eagerloads(True)

def batch_insert(model, items, batch_size=100):
    """Insert items in batches"""
    from backend.models import db
    
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        db.session.bulk_insert_mappings(model, batch)
        db.session.commit() 