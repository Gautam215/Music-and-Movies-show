import assert from "node:assert/strict";
import test from "node:test";
import {
  getYouTubePlayerState,
  pickConfidentYouTubeFallback,
  pickYouTubeTrailer,
  youtubeEmbedUrl,
} from "../lib/movie-trailers.ts";

const fallbackCandidate = {
  key: "a1B2c3D4e5F",
  name: "The Last Light (2025) | Official Trailer",
  channelTitle: "Last Light Studios",
  embeddable: true,
  privacyStatus: "public",
  uploadStatus: "processed",
};

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

test("YouTube playback state messages are parsed safely", () => {
  assert.equal(getYouTubePlayerState('{"event":"onStateChange","info":1}'), 1);
  assert.equal(
    getYouTubePlayerState({ event: "infoDelivery", info: { playerState: 2 } }),
    2,
  );
  assert.equal(getYouTubePlayerState("not-json"), null);
  assert.equal(getYouTubePlayerState({ event: "other", info: 1 }), null);
});

test("YouTube fallback accepts an exact-title public trailer", () => {
  assert.deepEqual(
    pickConfidentYouTubeFallback([fallbackCandidate], "The Last Light", 2025),
    {
      key: "a1B2c3D4e5F",
      name: "The Last Light (2025) | Official Trailer",
      embedUrl:
        "https://www.youtube-nocookie.com/embed/a1B2c3D4e5F?rel=0&modestbranding=1",
    },
  );
});

test("YouTube fallback rejects unrelated, weak, and conflicting-year titles", () => {
  for (const name of [
    "Cats Official Trailer",
    "The Last Light Chapter Two Official Trailer",
    "The Last Light Trailer Reaction",
    "The Last Light (2024) Official Trailer",
  ]) {
    assert.equal(
      pickConfidentYouTubeFallback(
        [{ ...fallbackCandidate, name }],
        "The Last Light",
        2025,
      ),
      null,
      name,
    );
  }
});

test("YouTube fallback rejects unavailable or ambiguous candidates", () => {
  assert.equal(
    pickConfidentYouTubeFallback(
      [{ ...fallbackCandidate, embeddable: false }],
      "The Last Light",
      2025,
    ),
    null,
  );
  assert.equal(
    pickConfidentYouTubeFallback(
      [fallbackCandidate, { ...fallbackCandidate, key: "f6E5d4C3b2A" }],
      "The Last Light",
      2025,
    ),
    null,
  );
});
