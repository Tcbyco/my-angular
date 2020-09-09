const sayHello = require("../src/hello");

describe("Hello", function () {
  it("says hello", function () {
    expect(sayHello("toby")).toBe("Hello, toby!");
  });
});
