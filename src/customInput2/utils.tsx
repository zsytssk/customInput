import { WhaleListTag } from '@whale-labs/want/es/list-tag/WhaleListTag';
import React, { ReactNode } from 'react';
import { BaseEditor, BaseNode, Editor, Transforms } from 'slate';
import { useFocused, useSelected } from 'slate-react';

import Icon from '@/Icon';

export const withMentions = (editor: BaseEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element: any) => {
    return element.type === 'mention' ? true : isInline(element);
  };

  editor.isVoid = (element: any) => {
    return element.type === 'mention' ? true : isVoid(element);
  };

  return editor;
};

export const withTextLimit = (limit: number) =>
  function Plugin(editor: BaseEditor) {
    const { insertText, insertNode } = editor;

    editor.insertText = (text: string) => {
      const curStr = getEditorString(editor);
      const nextStr = curStr + text;

      if (nextStr.length <= limit) {
        insertText.call(editor, text);
      } else {
        // 需要先插入再删除不然的话 会出现文字还是插入 但是编辑器状态却是删除的状态
        insertText.call(editor, text);

        // 这里需要异步处理，不然的话中文输入无法删除
        Promise.resolve().then(() => {
          deleteBackward(editor, text.length);
        });
      }
    };

    editor.insertNode = (node: any) => {
      const insertStr = getNodeStr(node);
      const oldStr = getEditorString(editor);
      const nextStr = oldStr + insertStr;
      if (nextStr.length <= limit) {
        insertNode.call(editor, node);
      }
    };

    return editor;
  };

export type MentionElement = {
  type: 'mention';
  character: string;
  children: CustomText[];
};
export type CustomText = {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  text: string;
};

export const insertMention = (editor: BaseEditor, character: any) => {
  const mention: MentionElement = {
    type: 'mention',
    character,
    children: [{ text: '' }],
  };

  editor.insertNode(mention);
  Transforms.move(editor);
};

export const Element = (props: any) => {
  const { attributes, children, element } = props;
  switch (element.type) {
    case 'mention':
      return <Mention {...props} />;
    default:
      return <div {...attributes}>{children}</div>;
  }
};

export function Tag({
  children,
  onRemove,
}: {
  children: ReactNode[];
  onRemove: () => void;
}) {
  return (
    <WhaleListTag className='cus-tag'>
      {children}{' '}
      <Icon
        onClick={() => onRemove()}
        type='icon-close_da'
        style={{
          color: 'rgba(0, 0, 0, 0.65)',
        }}
      />
    </WhaleListTag>
  );
}

const Mention = (props: any) => {
  const { attributes, children, element } = props;
  const selected = useSelected();
  const focused = useFocused();

  return (
    <span
      {...attributes}
      contentEditable={false}
      className={selected && focused ? 'mention-selected' : 'mention'}
      data-cy={`mention-${element.character.replace(' ', '-')}`}>
      {children}
      <Tag
        onRemove={() => {
          props.onRemove(props.element);
        }}>
        {element.character}
      </Tag>
    </span>
  );
};

type LocalNode = {
  type?: string;
  character?: string;
  text?: string;
  children?: [{ text: string }];
};
export function getEditorString(editor: any) {
  const nodes = getAllNodes(editor);

  const arr = [];
  for (const [node] of nodes) {
    arr.push(getNodeStr(node));
  }
  return arr.join(',');
}
export function getAllNodes(editor: any) {
  const range = Editor.range(editor, undefined as any);
  const nodes = Editor.nodes<LocalNode & BaseNode>(editor, {
    at: range,
    voids: true,
    match: ele => (ele as any).text || (ele as any).type === 'mention',
  });

  return Array.from(nodes);
}
export function getTopNodes(editor: any) {
  const range = Editor.range(editor, undefined as any);
  const nodes = Editor.nodes<LocalNode & BaseNode>(editor, {
    at: range,
    voids: true,
    // @ts-ignore
    match: ele => ele.type == 'paragraph',
  });

  return Array.from(nodes);
}

export function getNodeStr(node: LocalNode) {
  if (node.type === 'mention') {
    return node.character;
  } else {
    return node.text || '';
  }
}

export function deleteBackward(editor: BaseEditor, n: number) {
  for (let i = 0; i < n; i++) {
    editor.deleteBackward('character');
  }
}

export function clearContent(editor: BaseEditor) {
  const nodes = getTopNodes(editor);
  for (const [node, path] of nodes) {
    // editor.removeNodeByKey(item.key);
    Transforms.removeNodes(editor, { at: path });
  }
}

export function removeNode(editor: BaseEditor, ele: LocalNode & BaseNode) {
  const nodes = getAllNodes(editor);
  for (const [node, path] of nodes) {
    if (node === ele) {
      Transforms.removeNodes(editor, { at: path });
      return;
    }
  }
}

export function strToEditorValue(str: string) {
  const textArray = str?.split(',');

  const children: LocalNode[] = [];
  for (const item of textArray) {
    children.push({
      type: 'mention',
      character: item,
      children: [{ text: '' }],
    });
  }

  return [
    {
      type: 'paragraph',
      children: normalizeEditorValueList(children),
    },
  ];
}

export function normalizeEditorValueList(list: LocalNode[]) {
  if (list.length === 0) {
    return [{ text: '' }];
  }

  if (list.length === 1 && list[0].text === '') {
    return list;
  }
  return list.reduce((arr, elem) => {
    arr.push(elem);
    if (elem.text !== '') {
      arr.push({ text: '' });
    }
    return arr;
  }, [] as LocalNode[]);
}
