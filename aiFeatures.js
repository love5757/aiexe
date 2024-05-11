/* global process */
/* eslint-disable no-unused-vars, no-unreachable, no-constant-condition, no-constant-binary-expression */
import { makePreprocessingCode, shell_exec, execInVenv, attatchWatcher, execAdv } from './codeExecution.js'
import { isCorrectCode, code_validator, makeVEnvCmd } from './codeModifiers.js'
import { printError, isBadStr, addslashes, getCurrentDateTime, is_dir, is_file, isItem, splitStringIntoTokens, measureColumns, isWindows } from './commons.js'
import { createVENV, doctorCheck, disableAllVariable, disableVariable, getRCPath, readRCDaata, getVarVal, findMissingVars, isKeyInConfig, setVarVal } from './configuration.js'
import { threeticks, threespaces, disableOra, limitline, annn, responseTokenRatio, preprocessing, traceError, contextWindows, colors, forignLanguage, greetings, howAreYou, whatAreYouDoing, langtable } from './constants.js'
import { installProcess, realworld_which_python, which, getPythonVenvPath, getActivatePath, getPythonPipPath, venvCandidatePath, checkPythonForTermination } from './envLoaders.js'
import { oraSucceed, oraFail, oraStop, oraStart, oraBackupAndStopCurrent, print } from './oraManager.js'
import promptTemplate from './translationPromptTemplate.js';
import chalk from 'chalk';
import { highlight } from 'cli-highlight';
import axios from 'axios';
import shelljs from 'shelljs';
import readline from 'readline';
import path from 'path';
import fs from 'fs';
import ora from 'ora';
import boxen from 'boxen';
import readlineSync from 'readline-sync';
import figlet from 'figlet';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { promises as fsPromises } from 'fs';
import os from 'os';

let continousNetworkTryCount = 0;
export function setContinousNetworkTryCount(v) {
    continousNetworkTryCount = v;
}
export function getContinousNetworkTryCount() {
    return continousNetworkTryCount;
}

export async function aiChat(messages) {
    const USE_LLM = await getVarVal('USE_LLM');
    if (USE_LLM === 'openai') return await openaiChat(messages);
    if (USE_LLM === 'gemini') return await geminiChat(messages);
    if (USE_LLM === 'anthropic') return await anthropicChat(messages);
    if (USE_LLM === 'ollama') return await ollamaChat(messages);
    if (USE_LLM === 'groq') return await groqChat(messages);
}
export async function geminiChat(messages) {
    const debugMode = false;
    while (true) {
        let tempMessageForIndicator = oraBackupAndStopCurrent();
        let indicator = ora((`Requesting ${chalk.bold('gemini-pro')}`)).start()
        try {
            let python_code;
            let clonedMessage = JSON.parse(JSON.stringify(messages));
            clonedMessage = clonedMessage.map(line => {
                if (line.role === 'system') line.role = 'user';
                if (line.role === 'assistant') line.role = 'model';
                line.parts = [{ text: line.content }];
                delete line.content;
                return line;
            });
            const first = clonedMessage[0];
            clonedMessage.shift()
            clonedMessage = [
                first,
                {
                    "role": "model",
                    "parts": [
                        {
                            "text": "I understand. I will do."
                        }
                    ]
                },
                ...clonedMessage
            ];
            if (debugMode) debugMode.leave('AIREQ', {
                contents: clonedMessage
            });
            let response = await axiosPostWrap(`https://generativelanguage.googleapis.com/v1beta/models/${'gemini-pro'}:generateContent?key=${await getVarVal('GOOGLE_API_KEY')}`, {
                contents: clonedMessage
            }, { headers: { 'content-type': 'application/json' } });
            try {
                python_code = response.data.candidates[0].content.parts[0].text;
            } catch (errorInfo) {
                printError(errorInfo);
                if (response.data.candidates[0].finishReason) {
                    python_code = `${threeticks}\nprint("Request couldn't accept reason for ${response.data.candidates[0].finishReason}")\n${threeticks}`
                }
            }
            indicator.succeed(chalk.greenBright(`Requesting ${chalk.bold('gemini-pro')} succeeded`));
            oraStart(tempMessageForIndicator);
            return python_code;
        } catch (e) {
            printError(e);
            indicator.fail(chalk.red(`Requesting ${chalk.bold('gemini-pro')} failed`));
            oraStart(tempMessageForIndicator);

            if (e.code === 'ECONNRESET' || e.code === 'EPIPE') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw e;
                break;
            }

        }
    }
}
export async function anthropicChat(messages) {
    const ANTHROPIC_MODEL = await getVarVal('ANTHROPIC_MODEL');
    while (true) {
        let tempMessageForIndicator = oraBackupAndStopCurrent();
        let indicator = ora((`Requesting ${chalk.bold(ANTHROPIC_MODEL)}`)).start()
        try {
            let clonedMessage = JSON.parse(JSON.stringify(messages));
            let system = clonedMessage[0].content;
            clonedMessage.shift();
            let response = await axiosPostWrap('https://api.anthropic.com/v1/messages', {
                model: ANTHROPIC_MODEL,
                max_tokens: 1024,
                system,
                messages: clonedMessage
            }, {
                headers: {
                    'x-api-key': await getVarVal('ANTHROPIC_API_KEY'), // 환경 변수에서 API 키를 가져옵니다.
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                }
            });
            let resd = response.data.content[0].text;
            indicator.succeed(chalk.greenBright(`Requesting ${chalk.bold(ANTHROPIC_MODEL)} succeeded`));
            oraStart(tempMessageForIndicator);
            return resd;
        } catch (e) {
            printError(e);
            indicator.fail(chalk.red(`Requesting ${chalk.bold(ANTHROPIC_MODEL)} failed`));
            oraStart(tempMessageForIndicator);

            if (e.code === 'ECONNRESET' || e.code === 'EPIPE') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw e;
                break;
            }
        }
    }
}
export async function groqChat(messages) {
    let completion;
    const GROQ_MODEL = await getVarVal('GROQ_MODEL');
    const GROQ_API_KEY = await getVarVal('GROQ_API_KEY');
    while (true) {
        let tempMessageForIndicator = oraBackupAndStopCurrent();
        let indicator = ora((`Requesting ${chalk.bold(GROQ_MODEL)}`)).start()
        try {
            completion = await axiosPostWrap('https://api.groq.com/openai/v1/chat/completions', { model: GROQ_MODEL, messages, }, {
                headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
            });
            let python_code = completion.data.choices[0].message.content;
            indicator.succeed(chalk.greenBright(`Requesting ${chalk.bold(GROQ_MODEL)} succeeded`));
            oraStart(tempMessageForIndicator);
            return python_code;
        } catch (e) {
            printError(e);
            indicator.fail(chalk.red(`Requesting ${chalk.bold(GROQ_MODEL)} failed`));
            oraStart(tempMessageForIndicator);
            if (e?.response?.data?.error?.code === 'rate_limit_exceeded') {
                let numstr = e.response.data.error.message.split('Please try again in ')[1].split('. ')[0];
                function extractParts(str) {
                    const numericPart = str.match(/[\d.]+/g).join('');
                    const alphabetPart = str.match(/[a-zA-Z]+/g).join('');
                    return { numeric: Number(numericPart), alphabet: alphabetPart };
                }
                let waitTime;
                const parts = extractParts(numstr);
                if (parts.alphabet === 's') {
                    waitTime = parts.numeric * 1.1 * 1000;
                } else if (parts.alphabet === 'ms') {
                    waitTime = parts.numeric * 1.1;
                } else if (parts.alphabet === 'm') {
                    waitTime = parts.numeric * 1.1 * 1000 * 60;
                } else if (parts.alphabet === 'h') {
                    waitTime = parts.numeric * 1.1 * 1000 * 60 * 60;
                } else {
                    throw e;
                    break;
                }
                print(chalk.red(`You made many requests quickly, which overwhelmed the AI.\nIt will take ${numstr} break and try again.`));
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            else if (e.code === 'ECONNRESET' || e.code === 'EPIPE') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw e;
                break;
            }
        }
    }
}
export async function openaiChat(messages) {
    let completion;
    const OPENAI_MODEL = await getVarVal('OPENAI_MODEL');
    while (true) {
        let tempMessageForIndicator = oraBackupAndStopCurrent();
        let indicator = ora((`Requesting ${chalk.bold(OPENAI_MODEL)}`)).start()
        try {
            completion = await axiosPostWrap('https://api.openai.com/v1/chat/completions', { model: OPENAI_MODEL, messages, }, {
                headers: { 'Authorization': `Bearer ${await getVarVal('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' }
            });
            let python_code = completion.data.choices[0].message.content;
            indicator.succeed(chalk.greenBright(`Requesting ${chalk.bold(OPENAI_MODEL)} succeeded`));
            oraStart(tempMessageForIndicator);
            return python_code;
        } catch (e) {
            printError(e);
            indicator.fail(chalk.red(`Requesting ${chalk.bold(OPENAI_MODEL)} failed`));
            oraStart(tempMessageForIndicator);
            if (e.code === 'ECONNRESET' || e.code === 'EPIPE') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw e;
                break;
            }
        }
    }
}
export async function ollamaChat(messages) {
    let airesponse;
    let response;
    let options = {
        temperature: 0
    }
    const OLLAMA_PROXY_SERVER = await getVarVal('OLLAMA_PROXY_SERVER');
    const OLLAMA_MODEL = await getVarVal('OLLAMA_MODEL');
    if (OLLAMA_PROXY_SERVER) {
        while (true) {
            let tempMessageForIndicator = oraBackupAndStopCurrent();
            let indicator = ora((`Requesting ${chalk.bold(OLLAMA_MODEL)}`)).start()
            try {
                airesponse = await axiosPostWrap(OLLAMA_PROXY_SERVER, { proxybody: { model: OLLAMA_MODEL, stream: false, options, messages } });
                indicator.succeed(chalk.greenBright(`Requesting ${chalk.bold(OLLAMA_MODEL)} succeeded`));
                oraStart(tempMessageForIndicator);
                break;
            } catch (e) {
                printError(e);
                indicator.fail(chalk.red(`Requesting ${chalk.bold(OLLAMA_MODEL)} failed`));
                oraStart(tempMessageForIndicator);

                if (e.code === 'ECONNRESET' || e.code === 'EPIPE') {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    break;
                }
            }
        }
        response = airesponse.data;
    } else {
        let count = 10;
        while (count >= 0) {
            count--;
            let tempMessageForIndicator = oraBackupAndStopCurrent();
            let indicator = ora((`Requesting ${chalk.bold(OLLAMA_MODEL)}`)).start()
            try {
                airesponse = await axiosPostWrap('http://localhost:11434/api/chat', { model: OLLAMA_MODEL, stream: false, options, messages });
                indicator.succeed(chalk.greenBright(`Requesting ${chalk.bold(OLLAMA_MODEL)} succeeded`));
                oraStart(tempMessageForIndicator);
                break;
            } catch (e) {
                printError(e);
                indicator.fail(chalk.red(`Requesting ${chalk.bold(OLLAMA_MODEL)} failed`));
                oraStart(tempMessageForIndicator);
                if (e.code === 'ECONNRESET' || e.code === 'EPIPE') {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else if (e.code === 'ECONNREFUSED') {
                    await turnOnOllamaAndGetModelList();
                } else {
                    break;
                }
            }
        }
        response = airesponse?.data?.message?.content;
    }
    if (!response) response = '';
    return response;
}

export async function turnOnOllamaAndGetModelList() {
    let count = 10;
    while (count >= 0) {
        count--;
        try {
            return await axios.get('http://localhost:11434/api/tags');
        } catch (e) {
            printError(e);
            if (e.code === 'ECONNRESET' || e.code === 'EPIPE') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (e.code === 'ECONNREFUSED') {
                let ollamaPath = (await which('ollama')).trim();
                if (!ollamaPath) break;
                if (isBadStr(ollamaPath)) break;
                let ddd;
                if (isWindows()) ddd = await execAdv(`& '${ollamaPath}' list`, true, { timeout: 5000 });
                else ddd = await execAdv(`"${ollamaPath}" list`, true, { timeout: 5000 });
                let { code } = ddd;
                if (code) break;
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                break;
            }
        }
    }
}
export function combindMessageHistory(summary, messages_, history, askforce) {
    return [
        askforce === 'ask_opinion' ? {
            role: "system",
            content: [
                `You are an AI assistant. Your primary role is to assist users in verifying the correctness of code execution results and explaining the meaning and implications of those results.`,
                `As a code execution and interpretation assistant, you are responsible for:`,
                `- Reviewing the code execution results provided by the user and confirming whether they align with the expected output based on the code's logic and functionality.`,
                `- Providing clear and concise explanations of what the code execution results mean in the context of the problem being solved or the task being accomplished.`,
                ``,
                `${summary ? `## SUMMARY SO FAR:` : ''}`,
                `${summary ? summary : ''}`,
            ].join('\n').trim()
        } : {
            role: "system",
            content: [
                `# Create Python code to handle user requests`,
                `You are a python programmer who creates python code to solve user's request.  `,
                `The user will run the python code you will provide, so you should only provide python code that can be executed.  `,
                ``,
                `## INSTRUCTION:`,
                `- Response only the python code.`,
                `- As import modules, use try-except to first check whether the module you want to use exists, and if it does not exist, include logic to install it as a subprocess not the way commanding in Jupyter Notebooks like \`!pip\``,
                `- Please avoid using commands that only work in interactive environments like Jupyter Notebooks, especially those starting with \`!\`, in standard Python script files.`,
                `- Always use the explicit output method via the print function, not expression evaluation, when your Python code displays results.`,
                `- Code should include all dependencies such as variables and functions required for proper execution.`,
                `- Never explain about response`,
                `- The code must contain all dependencies such as referenced modules, variables, functions, and classes in one code.`,
                `- The entire response must consist of only one complete form of code.`,
                `${isWindows() ? `The Python code will run on Microsoft Windows Environment\n` : ''}`,
                `## CODING CONVENTIONS:`,
                `- STANDARD CODING STYLE TO IMPORT:`,
                `    If you want to use a module in your code, import the module using the following logic before using it.`,
                `    ${threeticks}python`,
                `    try:`,
                `        import package_name`,
                `    except ImportError:`,
                `        import subprocess`,
                `        subprocess.run(['pip', 'install', 'package_name'])`,
                `    package_name # using of the module after importing logic`,
                `    ${threeticks}`,
                ``,
                `## Exception`,
                `- As an exception, if you request a simple explanation that does not require Python code to resolve the user's request, please respond with an explanation in natural language rather than Python code.`,
                ``,
                `${summary ? `## SUMMARY SO FAR:` : ''}`,
                `${summary ? summary : ''}`,
            ].join('\n').trim()
        },
        ...messages_
        , ...history
    ]
}
export async function code_generator(summary, messages_ = [], history = [], askforce, debugMode, defineNewMission, addHistory, getPrompt) {
    const USE_LLM = await getVarVal('USE_LLM');
    let python_code = '';
    let abort = false;
    try {
        while (true) {
            let messages = combindMessageHistory(summary, messages_, history, askforce);
            oraStop();
            // run_code_causes_error            | 히스토리의 마지막은 user
            // nothing_responsed                | 히스토리의 마지막은 user
            // responsed_code_is_invalid_syntax | 히스토리 비었음
            // responsed_opinion                | 히스토리 비었음
            /*
                run_code_causes_error 에러메시지정리된것
                responsed_code_is_invalid_syntax 코드가아닌그냥말
                responsed_opinion 코드가아닌그냥말
                nothing_responsed 이전 요청내용
            */
            if (askforce === 'responsed_code_is_invalid_syntax') {
                let request = (await ask_prompt_text(`What can I do for you?`)).trim(); // 이 물음에서 진행했을때 `Nothing responsed`의 상황이 만들어진다.
                if (request) {
                    defineNewMission(request);
                } else {
                    abort = true;
                    break;
                }
                askforce = '';
                continue;
            }
            else if (askforce === 'responsed_opinion') {
                let request = (await ask_prompt_text(`What can I do for you?`)).trim();
                if (request) {
                    defineNewMission(request);
                } else {
                    abort = true;
                    break;
                }
                askforce = '';
                continue;
            }
            else if (askforce === 'run_code_causes_error' || askforce === 'nothing_responsed') {
                print('Would you like to request the creation of a revised code?')
                print('Please select an option:')
                setContinousNetworkTryCount(0);
                let mode = ['Create of a revised code', 'Modify Prompt', 'Quit'];
                let index = readlineSync.keyInSelect(mode, `Enter your choice`, { cancel: false });
                if (index === 0) {
                    askforce = '';
                    continue;
                }
                else if (index === 1) {
                    let askingMent = '';
                    if (askforce === 'run_code_causes_error') {
                        askingMent = 'What do you want me to do for this error?';
                    }
                    if (askforce === 'nothing_responsed') {
                        askingMent = 'What could I do for you?';
                    }
                    try {
                        print(`Previous prompt: ${chalk.bold(getPrompt())}`);
                        let request = (await ask_prompt_text(askingMent)).trim();
                        if (request) {
                            if (askforce === 'run_code_causes_error') {
                                history.at(-1).content += `\n\nDon't say anything`;
                                addHistory({ role: "assistant", content: '' });
                                defineNewMission(request, true); // dont remove
                                false && print(JSON.stringify(history, undefined, 3));
                            }
                            if (askforce === 'nothing_responsed') defineNewMission(request);
                            print('The request has been changed.\nRequesting again with the updated request.');
                        } else {
                            print('There are no changes.\nRequesting again with the original request.');
                        }
                    } catch (e) {
                        printError(e);
                        print(e);
                    }
                    askforce = '';
                    continue;
                }
                else if (index === 2) {
                    abort = true;
                    break;
                }
                print('')
            }
            oraStart(`Generating code with ${chalk.bold(await getModelName())}`);
            if (disableOra) oraStop();
            if (USE_LLM === 'ollama') {
                python_code = await aiChat(messages);
            } else if (USE_LLM === 'openai') {
                if (debugMode) debugMode.leave('AIREQ', messages);
                try {
                    python_code = await aiChat(messages);
                } catch (e) {
                    printError(e);
                    oraFail(chalk.redBright(e.response.data.error.message));
                    if (e.response.data.error.code === 'invalid_api_key') {
                        let answer = await ask_prompt_text(`What is your OpenAI API key for accessing OpenAI services?`);
                        await disableVariable('OPENAI_API_KEY');
                        await setVarVal('OPENAI_API_KEY', answer);
                        continue;
                    } else {
                        abort = true;
                        break;
                    }
                }
            } else if (USE_LLM === 'groq') {
                if (debugMode) debugMode.leave('AIREQ', messages);
                try {
                    python_code = await aiChat(messages);
                } catch (e) {
                    printError(e);
                    oraFail(chalk.redBright(e?.response?.data?.error?.message));
                    if (e.response.data.error.code === 'invalid_api_key') {
                        let answer = await ask_prompt_text(`What is your Groq API key for accessing Groq services?`);
                        await disableVariable('GROQ_API_KEY');
                        await setVarVal('GROQ_API_KEY', answer);
                        continue;
                    } else {
                        abort = true;
                        break;
                    }
                }
            } else if (USE_LLM === 'anthropic') {
                try {
                    python_code = await aiChat(messages)
                } catch (e) {
                    printError(e);
                    oraFail(chalk.redBright(e.response.data.error.message));
                    if (e.response.data.error.type === 'authentication_error') {
                        let answer = await ask_prompt_text(`What is your Anthropic API key for accessing Anthropic services?`);
                        await disableVariable('ANTHROPIC_API_KEY');
                        await setVarVal('ANTHROPIC_API_KEY', answer);
                        continue;
                    } else {
                        abort = true;
                        break;
                    }
                }

            } else if (USE_LLM === 'gemini') {
                try {
                    python_code = await aiChat(messages);
                } catch (e) {
                    printError(e);
                    oraFail(chalk.redBright(e.response.data.error.message));
                    if (e.response.data.error.status === 'INVALID_ARGUMENT') {
                        // 이 상황이 꼭 API키가 잘못되었을경우만 있는것은 아니다.
                        if (true) process.exit(1);
                    } else {
                        abort = true;
                        break;
                    }
                }
            }
            break;
        }
    } catch (errorInfo) { printError(errorInfo); }
    let err = '';
    let raw = python_code;
    let correct_code = await isCorrectCode(python_code, ['python3', 'python2', 'python', 'py', ''], false);
    if (correct_code.python_code) python_code = correct_code.python_code;
    if (correct_code.err) python_code = '';
    if (correct_code.err) err = correct_code.err;
    let generateSuccess = !err && !!python_code;
    if (generateSuccess) {
        oraSucceed(chalk.greenBright(`Generation succeeded with ${chalk.bold(await getModelName())}`))
    }
    oraStop();
    const rst = { raw, err, correct_code: !!python_code, python_code, abort, usedModel: await getModelName() };
    return rst;
}
export async function getModelName() {
    const USE_LLM = await getVarVal('USE_LLM');
    if (USE_LLM === 'openai') return await getVarVal('OPENAI_MODEL');
    if (USE_LLM === 'groq') return await getVarVal('GROQ_MODEL');
    if (USE_LLM === 'gemini') return 'gemini-pro';
    if (USE_LLM === 'anthropic') return await getVarVal('ANTHROPIC_MODEL');
    if (USE_LLM === 'ollama') return await getVarVal('OLLAMA_MODEL');
    return '';
}


export async function getContextWindowSize() {
    const mode = await getModelName();
    const data = contextWindows
    let value = data[mode];
    if (!value) value = 8192; // 걍.. 
    return value;
}


export function resultTemplate(result) {
    if (!result) return '';
    return [
        `# The code you provided caused the error.`,
        ``,
        `## stdout:`,
        `${result.stdout}`,
        ``,
        `## stderr:`,
        `${result.stderr}`,
        ``,
        `## WHAT TO DO:`,
        `- fix it!`,
    ].join('\n').trim()
}
export async function axiosPostWrap() {
    setContinousNetworkTryCount(getContinousNetworkTryCount() + 1)
    if (continousNetworkTryCount >= 10) {
        process.exit(1);
        return new Promise((resolve, reject) => {
            reject(new Error('too many tries'));
        })
    }
    return axios.post(...arguments);
}
export async function ask_prompt_text(prompt) {
    setContinousNetworkTryCount(0);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return await new Promise(resolve => {
        rl.question(' ' + prompt + ': ', (df) => {
            resolve(df);
            rl.close();
        });
    })
}