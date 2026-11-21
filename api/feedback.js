export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ status: false, error: "POST only" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const base64Image = params.get("base64_image");
    const caption = params.get("caption");

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const topicId = process.env.TELEGRAM_TOPIC_ID;

    if (!botToken || !chatId) {
      return new Response(JSON.stringify({ status: false, error: "Missing server environment configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!base64Image) {
      return new Response(JSON.stringify({ status: false, error: "Missing image" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const decoded = decodeURIComponent(base64Image)
      .replace(/%2B/g, "+")
      .replace(/%2F/g, "/")
      .replace(/%3D/g, "=");
    const binaryString = atob(decoded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const formData = new FormData();
    formData.append("chat_id", chatId);
    if (topicId) {
      formData.append("message_thread_id", topicId);
    }
    formData.append("caption", decodeURIComponent(caption || "Screenshot"));
    formData.append("parse_mode", "HTML");
    formData.append("photo", new Blob([bytes], { type: "image/jpeg" }), "screenshot.jpg");

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      body: formData
    });

    const tgResult = await tgResponse.json();

    return new Response(JSON.stringify({
      status: tgResult.ok,
      result: tgResult
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ status: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
