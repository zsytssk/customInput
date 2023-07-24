import { useRef, useState } from "react";
import ReactDom from "react-dom/client";

import { CustomInputCtrlRef } from "./customInput";
import { CustomInput1 } from "./customInput1";

import "./main.less";

const App = () => {
  const [value, setValue] = useState("");
  const ctrlRef = useRef<CustomInputCtrlRef>();

  return (
    <>
      <CustomInput1
        className="customInput"
        ctrlRef={ctrlRef}
        value={value}
        // maxLength={50}
        onChange={(val) => setValue(val)}
      />
      <button
        style={{ marginTop: 20 }}
        onClick={() => {
          const text = `\$\{插入字符\}`;
          ctrlRef.current?.insertTag(text);
        }}
      >
        插入
      </button>
    </>
  );
};

const root = ReactDom.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(<App />);
