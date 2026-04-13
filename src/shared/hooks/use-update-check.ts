import { useEffect, useState } from "react";
import appVersion from "../constants/app-version";

const RELEASES_URL =
  "https://api.github.com/repos/impulse-studio/loqui/releases/latest";

export default function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    fetch(RELEASES_URL)
      .then((res) => res.json())
      .then((data: { tag_name?: string }) => {
        if (!data.tag_name) return;
        const latest = data.tag_name.replace(/^v/, "");
        if (latest !== appVersion) {
          setUpdateAvailable(true);
        }
      })
      .catch(() => {
        // Silently ignore — no update badge if offline
      });
  }, []);

  return updateAvailable;
}
