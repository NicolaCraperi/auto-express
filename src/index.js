import express from "express";
import autoExpress from "./autoExpress";
import "@babel/polyfill";

const startServer = (apiDir, swaggerInfo, port, fn) => {
	const app = express();
	app.use(
		"/",
		autoExpress().swaggerInfo(swaggerInfo).serveSwagger().loadApiDir(apiDir)
	);
	app.listen(port, fn);
};

export default startServer;
