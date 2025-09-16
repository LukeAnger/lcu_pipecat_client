// src/components/home/Home.jsx
// Layout for the "Preview" tab.
// Renders the discussion header, then a left/right split: Chat (left) + Score Breakdown (right).
// Expects Pipecat/RTVI props from App and passes them through to <Chat/>.

import CustomSplitPane from "../common/CustomSplitPane";
import DiscussionTopic from "./DiscussionTopic";
import Chat from "./Chat";
import Sidepanel from "./Sidepanel";
import "./Home.css";

const Home = (props) => {
    const {
        status, transportState, logs,
        userTranscript, botTranscript, searchBlock,
        connect, disconnect, audioRef, unmuted, setUnmuted,
        activityBlock,
    } = props;

    return (
        <div className="home">
            {/* Header card above the split; can read from ActivityContext if needed */}
            <DiscussionTopic
                defaultExpanded={true}
            />

            {/* Main split: chat on the left, live rubric breakdown on the right */}
            <CustomSplitPane
                initialLeft={70}
                minLeftPx={600}
                minRightPx={320}
                left={
                    <Chat
                        status={status}
                        transportState={transportState}
                        logs={logs}
                        userTranscript={userTranscript}
                        botTranscript={botTranscript}
                        searchBlock={searchBlock}
                        activityBlock={activityBlock}
                        connect={connect}
                        disconnect={disconnect}
                        audioRef={audioRef}
                        unmuted={unmuted}
                        setUnmuted={setUnmuted}
                    />
                }
                right={<Sidepanel />}
            />
        </div>
    );
};

export default Home;
