export default class ConfigError extends Error {
	constructor(name, messsage, stack) {
		super(name, messsage, stack);
	}
}
