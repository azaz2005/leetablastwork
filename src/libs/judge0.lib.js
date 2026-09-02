// import axios from "axios";

// const JUDGE0_API_URL = (
//     process.env.JUDGE0_API_URL || "http://127.0.0.1:2358"
// ).replace(/\/+$/, "");

// export const getJudge0LanguageId = (language) => {
//     const languageMap = {
//         PYTHON: 71,
//         JAVA: 62,
//         JAVASCRIPT: 63,
//     };

//     return languageMap[String(language).toUpperCase()];
// };

// const sleep = (ms) =>
//     new Promise((resolve) => setTimeout(resolve, ms));

// export const submitBatch = async (submissions) => {
//     try {
//         console.log("JUDGE0 URL:", JUDGE0_API_URL);
//         console.log("SUBMISSIONS:", JSON.stringify(submissions, null, 2));

//         const response = await axios.post(
//             `${JUDGE0_API_URL}/submissions/batch`,
//             {
//                 submissions,
//             },
//             {
//                 params: {
//                     base64_encoded: false,
//                 },
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//                 timeout: 10000,
//             }
//         );

//         console.log("JUDGE0 SUBMISSION RESPONSE:", response.data);

//         return response.data;
//     } catch (error) {
//         console.error("JUDGE0 SUBMIT ERROR:");

//         if (error.response) {
//             console.error("Status:", error.response.status);
//             console.error("Data:", error.response.data);
//         } else {
//             console.error(error.message);
//         }

//         throw error;
//     }
// };

// export const pollBatchResults = async (tokens) => {
//     if (!Array.isArray(tokens) || tokens.length === 0) {
//         throw new Error("No Judge0 tokens received");
//     }

//     console.log("POLLING TOKENS:", tokens);

//     while (true) {
//         try {
//             const response = await axios.get(
//                 `${JUDGE0_API_URL}/submissions/batch`,
//                 {
//                     params: {
//                         tokens: tokens.join(","),
//                         base64_encoded: false,
//                     },
//                     timeout: 10000,
//                 }
//             );

//             const results = response.data?.submissions;

//             console.log(
//                 "JUDGE0 POLL:",
//                 JSON.stringify(results, null, 2)
//             );

//             // Judge0 can temporarily return null submissions.
//             if (
//                 !Array.isArray(results) ||
//                 results.length !== tokens.length ||
//                 results.some((result) => !result)
//             ) {
//                 await sleep(1000);
//                 continue;
//             }

//             /*
//              * Judge0 status IDs:
//              *
//              * 1 = In Queue
//              * 2 = Processing
//              *
//              * Anything else means execution has finished.
//              */
//             const allFinished = results.every(
//                 (result) =>
//                     result.status &&
//                     result.status.id !== 1 &&
//                     result.status.id !== 2
//             );

//             if (allFinished) {
//                 return results;
//             }

//             await sleep(500);
//         } catch (error) {
//             console.error("JUDGE0 POLL ERROR:");

//             if (error.response) {
//                 console.error("Status:", error.response.status);
//                 console.error("Data:", error.response.data);
//             } else {
//                 console.error(error.message);
//             }

//             throw error;
//         }
//     }
// };





import axios from "axios";

export const getJudge0LanguageId = (language) => {
    const languageMap = {
        PYTHON: 71,
        JAVA: 62,
        JAVASCRIPT: 63,
    };

    if (!language) {
        return undefined;
    }

    return languageMap[language.toUpperCase()];
};

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));


export const submitBatch = async (submissions) => {
    try {
        const url =
            `${process.env.JUDGE0_API_URL}/submissions/batch`;

        console.log("JUDGE0 SUBMIT URL:", url);
        console.log(
            "JUDGE0 SUBMISSIONS:",
            JSON.stringify(submissions, null, 2)
        );

        const { data } = await axios.post(
            url,
            {
                submissions,
            },
            {
                params: {
                    base64_encoded: false,
                },
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

        console.log(
            "JUDGE0 SUBMIT RESPONSE:",
            JSON.stringify(data, null, 2)
        );

        if (!Array.isArray(data)) {
            throw new Error(
                `Unexpected Judge0 batch response: ${JSON.stringify(data)}`
            );
        }

        return data;

    } catch (error) {
        console.error("JUDGE0 SUBMIT ERROR:");

        if (error.response) {
            console.error(
                "Status:",
                error.response.status
            );

            console.error(
                "Response:",
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );
        } else {
            console.error(error.message);
        }

        throw error;
    }
};


export const pollBatchResults = async (tokens) => {
    if (!Array.isArray(tokens) || tokens.length === 0) {
        throw new Error("No Judge0 tokens provided");
    }

    while (true) {
        const { data } = await axios.get(
            `${process.env.JUDGE0_API_URL}/submissions/batch`,
            {
                params: {
                    tokens: tokens.join(","),
                    base64_encoded: false,
                },
                timeout: 30000,
            }
        );

        console.log(
            "JUDGE0 POLL RESPONSE:",
            JSON.stringify(data, null, 2)
        );

        const results = data?.submissions;

        if (!Array.isArray(results)) {
            throw new Error(
                `Invalid Judge0 poll response: ${JSON.stringify(data)}`
            );
        }

        // Judge0 may temporarily return null for submissions
        // which have not been processed yet.
        if (results.some((result) => !result)) {
            await sleep(1000);
            continue;
        }

        const isAllDone = results.every(
            (result) =>
                result.status &&
                result.status.id !== 1 &&
                result.status.id !== 2
        );

        if (isAllDone) {
            return results;
        }

        await sleep(1000);
    }
};