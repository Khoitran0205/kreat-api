const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
  const authHeader = await req.header('Authorization');
  const token = await (authHeader && authHeader.split(' ')[1]);

  if (!token) return await res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
    if (err) return await res.sendStatus(403);
    req.user = user;
    await next();
  });
};

module.exports = authenticateToken;
