# Executive Intelligence

## About the Project

The Executive Intelligence is a demo of Perplexity Sonar powered application designed to provide executives and board members with instant, accurate, and credible intelligence for strategic decision-making. Recognizing the challenges of sifting through vast amounts of information quickly and reliably, this project focuses on delivering board-ready insights derived from real-time data sources, powered by Perplexity's Sonar API.

The inspiration was to create a dedicated "boardroom copilot" that streamlines competitive analysis, scenario planning, and benchmarking, while also maintaining a persistent memory of key intelligence, directly addressing the needs of busy executives.

## Features

The current version of the Executive Intelligence includes the following key features:

*   **A. Competitive Intelligence Briefs:** Generate comprehensive, board-ready competitive analysis for any company. Provides executive summaries, recent competitor moves, market shifts, recommendations, and full, verifiable citations for every claim.
*   **B. Scenario Planning (“What If?” Analysis):** Dynamically generate and analyze potential future scenarios based on real-time competitor and industry data. Get structured, cited reports exploring risks, opportunities, and recommendations for hypothetical situations.
*   **C. Board Pack Memory:** Save and organize key intelligence briefs, scenario analyses, and benchmark reports. Create a persistent, searchable knowledge base accessible in a dedicated Board Pack section.
*   **D. Instant Benchmarking & Peer Comparison:** Quickly generate source-cited, visual comparisons of your company against top competitors across critical metrics. Data points are linked to their sources, providing reliable support for strategic discussions.

## Built With

*   **Languages:** TypeScript, JavaScript
*   **Frameworks:** Next.js, React
*   **APIs:** Perplexity Sonar API
*   **Styling:** Tailwind CSS
*   **UI Libraries:** Headless UI (`@headlessui/react`), Radix UI components, Sonner (for toasts)
*   **Markdown Processing:** `react-markdown`, `remark-gfm`, `rehype-raw`
*   **State Management:** React Context
*   **Development Tools:** Cursor (AI pair programmer)

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Git
*   A Perplexity API key

### Installation

1.  Clone the repository:
    ```bash
    git clone [Your GitHub Repo URL]
    cd [Your Repo Name]
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  Set up environment variables:
    Create a `.env.local` file in the root of the project.
    ```env
    PERPLEXITY_API_KEY=YOUR_PERPLEXITY_API_KEY
    ```
    Replace `YOUR_PERPLEXITY_API_KEY` with your actual Perplexity API key.

4.  Run the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

*   **Company Input:** Enter the company you want to analyze in the input field at the top.
*   **Boardroom Intelligence:** Click the buttons within the "Executive Intelligence" card to generate Competitive Analysis Briefs, explore Scenario Planning, or view the Instant Benchmarking board.
*   **Save to Board Pack:** Use the "Save to Board Pack" button within the modals to store generated reports for later access.
*   **Board Pack:** Click the "📁 Board Pack" button on the main card to view saved items.

## Acknowledgements

*   Powered by the **Perplexity Sonar API** for generating accurate and cited intelligence.
*   Developed with significant assistance from **Cursor**, an AI pair programming tool.
