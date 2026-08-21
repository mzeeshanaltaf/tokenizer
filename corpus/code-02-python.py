"""Utilities for computing rolling statistics over a stream of numbers
without holding the entire history in memory."""

from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Iterable, Optional


@dataclass
class RollingStats:
    window: int
    _values: Deque[float] = field(default_factory=deque)
    _sum: float = 0.0
    _sum_sq: float = 0.0

    def push(self, value: float) -> None:
        self._values.append(value)
        self._sum += value
        self._sum_sq += value * value
        if len(self._values) > self.window:
            old = self._values.popleft()
            self._sum -= old
            self._sum_sq -= old * old

    @property
    def count(self) -> int:
        return len(self._values)

    @property
    def mean(self) -> Optional[float]:
        if not self._values:
            return None
        return self._sum / len(self._values)

    @property
    def variance(self) -> Optional[float]:
        n = len(self._values)
        if n < 2:
            return None
        m = self.mean
        return max(0.0, (self._sum_sq / n) - (m * m))

    def std(self) -> Optional[float]:
        var = self.variance
        return None if var is None else var**0.5


def rolling_means(values: Iterable[float], window: int) -> list[float]:
    stats = RollingStats(window=window)
    out = []
    for v in values:
        stats.push(v)
        if stats.count == window:
            out.append(stats.mean)
    return out


if __name__ == "__main__":
    sample = [4.0, 8.0, 6.0, 5.0, 9.0, 2.0, 7.0]
    print(rolling_means(sample, window=3))
