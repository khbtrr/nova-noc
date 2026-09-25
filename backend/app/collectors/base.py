from abc import ABC, abstractmethod
from app.models.device import Device

class BaseCollector(ABC):
    @abstractmethod
    async def collect(self, device: Device) -> dict:
        pass
