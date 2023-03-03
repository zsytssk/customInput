import classNames from "classnames";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Descendant, Transforms, createEditor } from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";

import { useDebounce } from "./hooks";
import {
  Element,
  getEditorString,
  insertMention,
  strToEditorValue,
  withMentions,
  withTextLimit,
} from "./utils";

import styles from "./index.module.less";

export type CustomInputCtrlRef = {
  insertTag: (text: string) => void;
};
type Props = {
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  ctrlRef?: React.MutableRefObject<CustomInputCtrlRef | undefined>;
};

export function CustomInput({
  disabled,
  value,
  onChange,
  className,
  placeholder,
  maxLength = 200,
  ctrlRef,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [stateId, setStateId] = useState(0);
  const [editorValue, setEditorValue] = useState<Descendant[]>([
    {
      // @ts-ignore
      type: "paragraph",
      children: [{ text: "" }],
    },
  ]);
  const textRef = useRef("");
  const editor = useMemo(
    () =>
      withReact(
        withHistory(
          withTextLimit(maxLength)(withMentions(createEditor())) as ReactEditor
        )
      ),
    [maxLength]
  );
  const renderElement = useCallback((props: any) => <Element {...props} />, []);

  const onPaste = useCallback(
    (event: any) => {
      const curStr = getEditorString(editor);
      const str = event.clipboardData.getData("text");

      if (str.length + curStr.length > maxLength) {
        event.preventDefault();
      }
    },
    [maxLength, editor]
  );

  const onLocalChange = useDebounce((newEditorValue) => {
    const newStr = getEditorString(editor);
    if (textRef.current === newStr) {
      return;
    }

    textRef.current = newStr;
    onChange(newStr);
    setEditorValue(newEditorValue);
  }, 30);

  useEffect(() => {
    if (textRef.current === value) {
      return;
    }
    textRef.current = value;
    const newEditorValue = strToEditorValue(value) as Descendant[];
    setEditorValue(newEditorValue);
    setStateId((old) => old + 1);
  }, [value]);

  useImperativeHandle(
    ctrlRef,
    () => {
      return {
        insertTag: (str: string | number) => {
          insertMention(editor, str);
          Promise.resolve().then(() => {
            if (editor.selection) {
              const previousSelection = Object.assign({}, editor.selection);
              Transforms.select(editor, previousSelection);
            }
          });
        },
      };
    },
    [editor]
  );

  return (
    <div
      className={classNames(className, styles.customInputWrap, {
        disabled,
        focused,
      })}
    >
      <div className="inner">
        {/* stateId让state强制更新，不然setEditorValue设置不起作用 */}
        <Slate
          key={`customTextareaWrap` + stateId}
          editor={editor}
          value={editorValue}
          onChange={onLocalChange}
        >
          <Editable
            className="edit_area"
            onFocus={() => {
              setFocused(true);
            }}
            onBlur={() => {
              setFocused(false);
            }}
            onPaste={onPaste}
            readOnly={disabled}
            placeholder={placeholder}
            renderElement={renderElement}
          />
        </Slate>
      </div>
      {maxLength ? (
        <div className="maxLength">
          <span className="in-num">{textRef.current.length}</span>/{maxLength}
        </div>
      ) : null}
    </div>
  );
}
