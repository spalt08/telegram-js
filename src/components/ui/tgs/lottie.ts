const animationData = new Map<string, any>();

export async function fetchAnimation(src: string) {
  const cached = animationData.get(src);
  if (cached) return cached;

  return fetch(src)
    .then((response) => response.json())
    .then((data) => {
      animationData.set(src, data);
      return data;
    });
}
