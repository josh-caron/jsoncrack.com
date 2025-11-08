import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, TextInput } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useFile from "../../../store/useFile";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// Get editable fields from node data (excluding arrays and objects)
const getEditableFields = (nodeRows: NodeData["text"]) => {
  const fields: Record<string, any> = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object" && row.key) {
      fields[row.key] = row.value;
    }
  });
  return fields;
};

// Check if node has editable content (not just arrays/objects)
const isNodeEditable = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return false;
  return nodeRows.some(row => row.type !== "array" && row.type !== "object");
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const updateNodeAtPath = useFile(state => state.updateNodeAtPath);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editedValues, setEditedValues] = React.useState<Record<string, any>>({});

  const editable = isNodeEditable(nodeData?.text ?? []);

  React.useEffect(() => {
    if (opened && nodeData?.text) {
      setEditedValues(getEditableFields(nodeData.text));
      setIsEditMode(false);
    }
  }, [opened, nodeData]);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleSave = () => {
    if (nodeData?.path) {
      updateNodeAtPath(nodeData.path, editedValues);
      setIsEditMode(false);
      onClose();
    }
  };

  const handleCancel = () => {
    setEditedValues(getEditableFields(nodeData?.text ?? []));
    setIsEditMode(false);
  };

  const handleFieldChange = (key: string, value: string) => {
    // Try to parse the value to maintain type
    let parsedValue: any = value;
    
    // Try to parse as number
    if (!isNaN(Number(value)) && value !== "") {
      parsedValue = Number(value);
    } 
    // Try to parse as boolean
    else if (value === "true" || value === "false") {
      parsedValue = value === "true";
    }
    // Try to parse as null
    else if (value === "null") {
      parsedValue = null;
    }
    
    setEditedValues(prev => ({
      ...prev,
      [key]: parsedValue
    }));
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs" align="center">
              {editable && !isEditMode && (
                <Button size="xs" onClick={handleEdit}>
                  Edit
                </Button>
              )}
              {isEditMode && (
                <>
                  <Button size="xs" color="green" onClick={handleSave}>
                    Save
                  </Button>
                  <Button size="xs" color="red" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              )}
              <CloseButton onClick={onClose} />
            </Flex>
          </Flex>
          
          {isEditMode ? (
            <Stack gap="md" miw={350} maw={600}>
              {Object.entries(editedValues).map(([key, value]) => (
                <TextInput
                  key={key}
                  label={key}
                  value={String(value ?? "")}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                />
              ))}
            </Stack>
          ) : (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
          )}
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
