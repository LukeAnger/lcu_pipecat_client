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
        activityBlock
    } = props;

    return (
        <div className="home">
            <DiscussionTopic
                title="EM Algorithms and examples of special cases"
                question="Give an intuitive explanation of how the EM Algorithm works, with examples of unsupervised algorithms that are special cases"
                imageSrc="/img/em.png"          /* optional */
                defaultExpanded={true}
            />
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
