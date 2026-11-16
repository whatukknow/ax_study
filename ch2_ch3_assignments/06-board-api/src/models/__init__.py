"""ORM 모델 패키지입니다.

여기서 모든 모델을 import 해 두면, main.py 에서 `import models` 한 번으로
Base.metadata 에 모든 테이블이 등록되어 create_all 이 테이블을 빠짐없이 만듭니다.
"""

from models.post import Post
from models.user import User

__all__ = ["User", "Post"]
