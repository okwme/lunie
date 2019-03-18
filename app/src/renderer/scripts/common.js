"use strict"

const BN = require(`bignumber.js`).BigNumber

// if given a valid address this will return the prefix plus some parameter
// length of the end. if it is not an address it will take that parameter
// length and return half of it as the beginning of the "address" and hald the end
module.exports.shortAddress = function (address, length = 4) {
  if (address.indexOf(`1`) === -1) {
    return address.length <= length * 2
      ? address
      : address.slice(0, Math.floor(length)) +
      `…` +
      address.slice(-1 * Math.ceil(length))
  } else {
    if (length > address.split(`1`)[1].length) return address
    return address.split(`1`)[0] + `…` + address.slice(-1 * length)
  }
}

module.exports.coinsToObject = function (coinArray) {
  return coinArray && coinArray.reduce(
    (dictionary, { denom, amount }) =>
      ({ ...dictionary, [denom]: Number(amount) || 0 }),
    {}
  )
}

// convert rat format ('123/456') to big number
module.exports.ratToBigNumber = function (rat) {
  if (rat.indexOf(`/`) !== -1) {
    const n = new BN(rat.split(`/`)[0])
    const d = new BN(rat.split(`/`)[1] || 1)
    return n.div(d)
  }
  return new BN(rat)
}

// could be used in optimistic update PR, pls uncomment or delete when addressed
module.exports.calculateShares = function (validator, tokens) {
  const myTokens = new BN(tokens || 0)

  const totalShares = new BN(validator.delegator_shares)
  const totalTokens = new BN(validator.tokens)

  if (totalTokens.eq(0)) return new BN(0)
  return myTokens
    .times(totalShares)
    .div(totalTokens)
}

module.exports.calculateTokens = function (validator, shares) {
  // this is the based on the idea that tokens should equal
  // (myShares / totalShares) * totalTokens where totalShares
  // and totalTokens are both represented as fractions
  const myShares = new BN(shares || 0)
  const totalShares = new BN(validator.delegator_shares)
  const totalTokens = new BN(validator.tokens)

  if (totalShares.eq(0)) return new BN(0)
  return myShares
    .times(totalTokens)
    .div(totalShares)
}

module.exports.sleep = function (amount) {
  return new Promise(resolve => {
    setTimeout(resolve, amount)
  })
}
