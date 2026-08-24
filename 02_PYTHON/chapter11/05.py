import time
import asyncio

async def cook_ramen(t):

    print("라면 조리를 시작합니다.")
    await asyncio.sleep(t)
    print("라면 조리가 완료되었습니다.")



asyncio.run(cook_ramen(3))
