import classNames from "classnames";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Descendant, Editor, Transforms, createEditor } from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";

import { useDebounce } from "./hooks";
import {
  Element,
  clearContent,
  getEditorString,
  insertMention,
  normalizeEditorValueList,
  removeNode,
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

/** 自定义输入框 */
export function CustomInput1({
  disabled,
  value = "",
  onChange,
  className,
  placeholder,
  maxLength,
  ctrlRef,
}: Props) {
  const onInputChineseRef = useRef(false);
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
  const editor = useMemo(() => {
    if (maxLength !== undefined) {
      return withReact(
        withHistory(
          withTextLimit(maxLength)(withMentions(createEditor())) as ReactEditor
        )
      );
    } else {
      return withReact(
        withHistory(withMentions(createEditor()) as ReactEditor)
      );
    }
  }, [maxLength]);

  const renderElement = useCallback(
    (props: any) => {
      return (
        <Element
          {...props}
          onRemove={(ele: any) => {
            removeNode(editor, ele);
          }}
        />
      );
    },
    [editor]
  );

  const onPaste = useCallback(
    (event: any) => {
      const curStr = getEditorString(editor);
      const str = event.clipboardData.getData("text");
      if (maxLength) {
        if (str.length + curStr.length > maxLength) {
          event.preventDefault();
        }
      }
    },
    [editor, maxLength]
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

  const changeToMention = useCallback(() => {
    const list = (editorValue[0] as any)?.children;
    if (!list?.length) {
      return;
    }

    const new_list = [];
    for (const item of list) {
      if (item.text && item.type !== "mention") {
        new_list.push({
          type: "mention",
          character: item.text,
          children: [{ text: "" }],
        });
      } else {
        new_list.push(item);
      }
    }

    const new_value = [
      {
        type: "paragraph",
        children: normalizeEditorValueList(new_list),
      },
    ];

    clearContent(editor);
    setEditorValue(new_value as any);
    setStateId((old) => old + 1);
    // blur -> focus 应该会重新出发 slate计算位置，不然会报错
    ReactEditor.blur(editor);
    setTimeout(() => {
      ReactEditor.focus(editor);
      Transforms.select(editor, Editor.end(editor, []));
    });
  }, [editorValue, editor]);

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
          editor={editor}
          initialValue={editorValue}
          onChange={onLocalChange}
          key={`customTextareaWrap` + stateId}
        >
          <Editable
            className="edit_area"
            onFocus={() => {
              setFocused(true);
            }}
            onBlur={() => {
              setFocused(false);
            }}
            onCompositionStart={() => {
              onInputChineseRef.current = true;
            }}
            onCompositionEnd={() => {
              onInputChineseRef.current = false;
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || onInputChineseRef.current) {
                return;
              }
              event.preventDefault();
              changeToMention();
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
