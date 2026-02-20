const base = require("./base")

module.exports = {
  ...base,
  env: {
    ...base.env,
    browser: true,
    node: true,
  },
  extends: [...base.extends, "next/core-web-vitals"],
}
