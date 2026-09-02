// 

import {
    submitBatch,
    pollBatchResults,
} from "../libs/judge0.lib.js";


export const executeCode = async (req, res) => {
    try {
        const {
            source_code,
            language_id,
            stdin,
            expected_outputs,
            problemId,
        } = req.body;

        console.log("=================================");
        console.log("EXECUTE CODE REQUEST");
        console.log("Language:", language_id);
        console.log("Problem:", problemId);
        console.log(
            "Test cases:",
            Array.isArray(stdin) ? stdin.length : 0
        );
        console.log("=================================");


        // Validate source code
        if (
            typeof source_code !== "string" ||
            source_code.trim() === ""
        ) {
            return res.status(400).json({
                error: "source_code is required",
            });
        }


        // Validate language
        if (!language_id) {
            return res.status(400).json({
                error: "language_id is required",
            });
        }


        // Validate stdin
        if (!Array.isArray(stdin) || stdin.length === 0) {
            return res.status(400).json({
                error: "stdin must be a non-empty array",
            });
        }


        // Validate expected outputs
        if (
            !Array.isArray(expected_outputs) ||
            expected_outputs.length !== stdin.length
        ) {
            return res.status(400).json({
                error:
                    "expected_outputs must be an array with the same length as stdin",
            });
        }


        // Create Judge0 submissions
        const submissions = stdin.map((input) => ({
            source_code,
            language_id: Number(language_id),
            stdin: String(input ?? ""),
        }));


        console.log(
            "SUBMISSIONS:",
            JSON.stringify(submissions, null, 2)
        );


        // Submit to Judge0
        const submitResponse =
            await submitBatch(submissions);


        console.log(
            "SUBMISSION RESPONSE:",
            JSON.stringify(
                submitResponse,
                null,
                2
            )
        );


        // Judge0 v1.13.1 returns:
        //
        // [
        //   { token: "..." },
        //   { token: "..." }
        // ]

        if (
            !Array.isArray(submitResponse) ||
            submitResponse.length !== submissions.length
        ) {
            throw new Error(
                "Judge0 did not return valid submission tokens"
            );
        }


        const tokens = submitResponse.map(
            (submission) => submission?.token
        );


        if (
            tokens.length !== submissions.length ||
            tokens.some((token) => !token)
        ) {
            throw new Error(
                `Invalid Judge0 tokens: ${JSON.stringify(
                    submitResponse
                )}`
            );
        }


        console.log("TOKENS:", tokens);


        // Wait for all executions
        const results =
            await pollBatchResults(tokens);


        console.log(
            "FINAL JUDGE0 RESULTS:",
            JSON.stringify(results, null, 2)
        );


        // Compare outputs
        const testResults = results.map(
            (result, index) => {

                const actualOutput =
                    String(result.stdout ?? "")
                        .replace(/\r\n/g, "\n")
                        .trim();

                const expectedOutput =
                    String(
                        expected_outputs[index] ?? ""
                    )
                        .replace(/\r\n/g, "\n")
                        .trim();


                const passed =
                    result.status?.id === 3 &&
                    actualOutput === expectedOutput;


                return {
                    testCase: index + 1,
                    input: stdin[index],
                    expected: expectedOutput,
                    actual: actualOutput,
                    passed,

                    status: result.status,

                    stdout: result.stdout,
                    stderr: result.stderr,

                    compile_output:
                        result.compile_output,

                    time: result.time,
                    memory: result.memory,

                    token: result.token,
                    message: result.message,
                };
            }
        );


        const passedTestCases =
            testResults.filter(
                (test) => test.passed
            ).length;


        const allPassed =
            passedTestCases === testResults.length;


        return res.status(200).json({
            message: "Code Executed!",

            problemId,

            passed: allPassed,

            totalTestCases:
                testResults.length,

            passedTestCases,

            results: testResults,
        });


    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "EXECUTE CODE ERROR"
        );

        console.error(error);

        if (error.response) {
            console.error(
                "Judge0 HTTP STATUS:",
                error.response.status
            );

            console.error(
                "Judge0 RESPONSE:",
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );
        }

        console.error(
            "================================="
        );


        return res.status(500).json({
            error:
                error.message ||
                "Code execution failed",
        });
    }
};