import Footer from "../components/footer/footer";
import Navbar from "../components/navbar/navbar";
import SearchBox from "../components/searchbox/searchbox";

function App() {
  return (
    <div className="bg-slate-900 h-screen">
      <Navbar />
      <SearchBox />
      <Footer />
    </div>
  );
}

export default App;
