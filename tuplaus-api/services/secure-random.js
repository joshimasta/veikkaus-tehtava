const randInt = (min, max) => {
  return Math.floor(min) + Math.floor(Math.random() * (Math.floor(max) - Math.floor(min)));
};
export { randInt };
