async function query(data) {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  const result = await response.json();
  return result;
}

export const classify = async (title) => {
  return query({
    inputs:
      title,
    parameters: {
      candidate_labels: ["Clothes", "Food", "Cosmetic", "Electronics"],
    },
  }).then((response) => {
    const results = response;
    console.log(JSON.stringify(response));
    console.log(response);

    const max = results.reduce((prev, current) =>
      prev && prev["score"] > current["score"] ? prev : current
    );
    if (max["score"] > 0.5) {
      console.log(max["label"])
      return max["label"];
    }
    return "";

  });
};

async function test() {
  const result = await classify("TACVASEN Men's Winter Skiing Jackets Water Resistant Fleece Coats Insulated Thermal Snowboard Jacket Parka Raincoat with Hood")
  console.log(result)
}

test()
