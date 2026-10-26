import { run } from "./cli";

const { exitCode, message } = run(process.argv.slice(2));
(exitCode === 0 ? console.log : console.error)(message);
process.exitCode = exitCode;
