export function getRandomElementFromSet<T>(set: Set<T>): T | undefined {
    if (set.size === 0) {
      return undefined;
    }
    const values = Array.from(set);
    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
  }