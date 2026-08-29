module.exports = async function handler(req, res) {
  res.status(200).json({
    success: true,
    message: "JARVIS API is working!"
  });
};
