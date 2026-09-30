from unittest.mock import AsyncMock, patch

import pytest

from app.ai.retrieval import retrieve_concepts


@pytest.mark.asyncio
async def test_retrieve_concepts_returns_empty_list_when_embedding_fails():
    with patch("app.ai.retrieval.get_embedding", new=AsyncMock(return_value=None)):
        result = await retrieve_concepts("anything")
    assert result == []