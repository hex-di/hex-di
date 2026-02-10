import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "silent-swallower",
  title: "The Silent Swallower",
  before: {
    code: `async function useUserPhoto(userId: string) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    fetchUserPhoto(userId)
      .then(url => setPhotoUrl(url))
      .catch(() => null);  // Error? What error?
  }, [userId]);
  return photoUrl; // null = no photo? error? loading?
}`,
    language: "typescript",
    filename: "use-user-photo.ts",
    highlights: [6, 8],
    annotations: [
      { line: 6, text: "Error silently swallowed", type: "error" },
      { line: 8, text: "null is ambiguous: no photo vs error vs loading", type: "error" },
    ],
  },
  after: {
    code: `function fetchUserPhoto(id: string): ResultAsync<string, PhotoError> {
  return fromPromise(fetch(\`/api/users/\${id}/photo\`), () => NetworkError({}))
    .andThen((res) => {
      if (res.status === 401) return err(AuthExpired({}));
      if (res.status === 404) return err(NotFound({ id }));
      if (!res.ok) return err(NetworkError({ status: res.status }));
      return fromPromise(res.json(), () => NetworkError({}));
    })
    .map((data) => data.url);
}
result.match(
  (url) => setPhotoUrl(url),
  (error) => {
    if (error._tag === "AuthExpired") redirectToLogin();
    if (error._tag === "NotFound") setPhotoUrl(DEFAULT_AVATAR);
  }
);`,
    language: "typescript",
    filename: "use-user-photo.ts",
    highlights: [1, 11],
    annotations: [
      { line: 1, text: "fromPromise wraps only the throwing boundary", type: "ok" },
      { line: 11, text: "match() forces handling every case", type: "ok" },
    ],
  },
};
