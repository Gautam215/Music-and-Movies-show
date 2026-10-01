import assert from "node:assert/strict";
import test from "node:test";
import { pickYouTubeTrailer, youtubeEmbedUrl } from "../lib/movie-trailers.ts";

test("trailer selection prefers an official YouTube trailer", () => {
  const trailer = pickYouTubeTrailer([
    { key: "teaser-key", name: "Teaser", site: "YouTube", type: "Teaser" },
    {
      key: "official-key",
      name: "Official Trailer",
      site: "YouTube",
      type: "Trailer",
      official: true,
    },
    { key: "vimeo-key", name: "Trailer", site: "Vimeo", type: "Trailer" },
  ]);

  assert.deepEqual(trailer, {
    key: "official-key",
    name: "Official Trailer",
    embedUrl:
      "https://www.youtube-nocookie.com/embed/official-key?rel=0&modestbranding=1",
  });
});

test("trailer selection rejects unsupported or unsafe video records", () => {
  assert.equal(
    pickYouTubeTrailer([
      { key: "short", name: "Trailer", site: "YouTube", type: "Trailer" },
      { key: "vimeo-key", name: "Trailer", site: "Vimeo", type: "Trailer" },
    ]),
    null,
  );
  assert.equal(youtubeEmbedUrl("bad key"), null);
});
