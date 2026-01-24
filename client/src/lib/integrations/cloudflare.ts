export async function uploadToCloudflare(file: File, client = 'teemplot') {
  const endpoint = import.meta.env.VITE_CF_IMAGE_WORKER_URL || 'https://cf-image-worker.sabimage.workers.dev';
  const form = new FormData();
  form.append('image', file);
  form.append('client', client);
  const res = await fetch(`${endpoint}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error('Cloudflare upload failed');
  }
  const data = await res.json();
  return {
    key: data.key,
    url: data.url,
    original_filename: file.name,
  };
}
