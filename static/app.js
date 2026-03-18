const form = document.getElementById("search-form");
const loadMoreBtn = document.getElementById("load-more");
const results = document.getElementById("results");
const statusEl = document.getElementById("status");

const state = {
  tags: "",
  source: "danbooru",
  nextPage: 1,
  busy: false,
};

function setStatus(text) {
  statusEl.textContent = text;
}

function pickFirst(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return "";
}

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function getImageUrl(post) {
  return normalizeUrl(
    pickFirst(post, ["large_file_url", "file_url", "preview_file_url", "sample_url", "preview_url"])
  );
}

function getPostUrl(post, source) {
  const id = post?.id;
  if (!id) return "";

  if (source === "danbooru") return `https://danbooru.donmai.us/posts/${id}`;
  if (source === "yandere") return `https://yande.re/post/show/${id}`;
  if (source === "konachan") return `https://konachan.com/post/show/${id}`;
  if (source === "gelbooru") return `https://gelbooru.com/index.php?page=post&s=view&id=${id}`;

  return "";
}

function appendPosts(posts, source) {
  if (!posts || posts.length === 0) {
    if (!results.children.length) {
      results.innerHTML = '<p class="empty">No results.</p>';
    }
    return;
  }

  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const imageUrl = getImageUrl(post);
    if (!imageUrl) return;

    const postUrl = getPostUrl(post, source) || imageUrl;

    const card = document.createElement("article");
    card.className = "card";

    const link = document.createElement("a");
    link.href = postUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = imageUrl;
    img.alt = `post ${post.id ?? ""}`;
    img.loading = "lazy";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span>#${post.id ?? "?"}</span><span>${source}</span>`;

    link.appendChild(img);
    card.appendChild(link);
    card.appendChild(meta);
    fragment.appendChild(card);
  });

  if (results.querySelector(".empty")) {
    results.innerHTML = "";
  }
  results.appendChild(fragment);
}

async function fetchBatch(reset = false) {
  if (state.busy) return;
  state.busy = true;

  form.querySelector("button[type='submit']").disabled = true;
  loadMoreBtn.disabled = true;

  const url = new URL(window.location.origin + "/api/posts");
  url.searchParams.set("tags", state.tags);
  url.searchParams.set("source", state.source);
  url.searchParams.set("page", String(state.nextPage));

  setStatus(`Loading page ${state.nextPage}...`);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const posts = Array.isArray(data.pics) ? data.pics : [];

    if (reset) {
      results.innerHTML = "";
    }

    appendPosts(posts, state.source);

    state.nextPage = Number(data.nextPage || state.nextPage + 1);
    loadMoreBtn.disabled = false;
    setStatus(`Loaded ${posts.length} post(s). Next page: ${state.nextPage}`);
  } catch (error) {
    setStatus(error?.message || "Request failed");
  } finally {
    form.querySelector("button[type='submit']").disabled = false;
    state.busy = false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  state.tags = String(formData.get("tags") || "").trim();
  state.source = String(formData.get("source") || "danbooru");
  state.nextPage = Math.max(1, Number(formData.get("page") || 1));

  if (!state.tags) {
    setStatus("Please enter tags.");
    return;
  }

  fetchBatch(true);
});

loadMoreBtn.addEventListener("click", () => {
  fetchBatch(false);
});
