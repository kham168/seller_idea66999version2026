function test(req, res) {
    const data = { message: "This is test endpoint" };
    return res.json(data);
}
export { test };
