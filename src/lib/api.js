const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";


export async function apiHealth() {

  const response = await fetch(
    `${API_URL}/health`
  );

  if (!response.ok) {
    throw new Error("Backend unavailable");
  }

  return response.json();
}


export async function getDemoSoul() {

  const response = await fetch(
    `${API_URL}/soul/demo`
  );

  if (!response.ok) {
    throw new Error("Unable to load Soul");
  }

  return response.json();
}


export async function apiChat(message) {

  const response = await fetch(
    `${API_URL}/soul/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message
      })
    }
  );

  if (!response.ok) {
    throw new Error("Chat API failed");
  }

  return response.json();
}


export async function apiChoice(action) {

  const response = await fetch(
    `${API_URL}/soul/choice`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        action
      })
    }
  );

  if (!response.ok) {
    throw new Error("Choice API failed");
  }

  return response.json();
}


export async function apiRandomRival() {
  const response = await fetch(`${API_URL}/arena/rival/random`);
  if (!response.ok) {
    throw new Error("Could not load random rival");
  }
  return response.json();
}

export async function apiBattle(rivalId) {
  const response = await fetch(`${API_URL}/arena/battle/${rivalId}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Battle API failed");
  }
  return response.json();
}

export async function apiDailyCheck() {
  const response = await fetch(
    `${API_URL}/soul/daily`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Daily check failed");
  }

  return response.json();
}

export async function apiGetTodayQuest() {
  const response = await fetch(`${API_URL}/soul/quest/today`);
  if (!response.ok) {
    throw new Error("Could not load today's quest");
  }
  return response.json();
}

export async function apiChogBalance(address) {
  const response = await fetch(`${API_URL}/chog/token-balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!response.ok) {
    throw new Error("Could not read $CHOG balance");
  }
  return response.json();
}

export async function apiRandomDemoChog() {
  const response = await fetch(`${API_URL}/chog/demo-random`);
  if (!response.ok) {
    throw new Error("Could not load a demo Chog");
  }
  return response.json();
}

export async function apiAchievements() {
  const response = await fetch(`${API_URL}/soul/achievements`);
  if (!response.ok) {
    throw new Error("Could not load achievements");
  }
  return response.json();
}

export async function apiRivalTaunt() {
  const response = await fetch(`${API_URL}/arena/rival/taunt`);
  if (!response.ok) {
    throw new Error("Could not load rival taunt");
  }
  return response.json();
}