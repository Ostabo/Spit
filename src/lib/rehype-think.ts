export default function rehypeThink() {
    return (tree: any) => {
        let collecting = false;
        let buffer: any[] = [];

        function flushBuffer(result: any[]) {
            if (buffer.length > 0) {
                result.push({
                    type: 'element',
                    tagName: 'think',
                    properties: {},
                    // children als divs wrappen, um verschachtelte <p> zu vermeiden
                    children: buffer.map(child =>
                        child.type === 'element' && child.tagName === 'p'
                            ? {...child, tagName: 'div'}
                            : child
                    ),
                });
                buffer = [];
            }
        }

        function processNodes(nodes: any[]): any[] {
            const result: any[] = [];

            for (let node of nodes) {
                if (node.type === 'text' || node.type === 'raw') {
                    let remaining = node.value;

                    while (remaining.length > 0) {
                        if (!collecting) {
                            const startIdx = remaining.indexOf('<think>');
                            if (startIdx !== -1) {
                                if (startIdx > 0) {
                                    result.push({...node, value: remaining.slice(0, startIdx)});
                                }
                                remaining = remaining.slice(startIdx + 7);
                                collecting = true;
                            } else {
                                result.push({...node, value: remaining});
                                remaining = '';
                            }
                        } else {
                            const endIdx = remaining.indexOf('</think>');
                            if (endIdx !== -1) {
                                if (endIdx > 0) {
                                    buffer.push({...node, value: remaining.slice(0, endIdx)});
                                }
                                flushBuffer(result);
                                remaining = remaining.slice(endIdx + 8);
                                collecting = false;
                            } else {
                                buffer.push({...node, value: remaining});
                                remaining = '';
                            }
                        }
                    }
                } else if (node.children) {
                    const newChildren = processNodes(node.children);
                    const newNode = {...node, children: newChildren};
                    if (collecting) {
                        buffer.push(newNode);
                    } else {
                        result.push(newNode);
                    }
                } else {
                    if (collecting) {
                        buffer.push(node);
                    } else {
                        result.push(node);
                    }
                }
            }

            return result;
        }

        tree.children = processNodes(tree.children);

        // Catch any dangling <think> with no closing tag
        if (buffer.length > 0) {
            tree.children.push({
                type: 'element',
                tagName: 'think',
                properties: {},
                children: [...buffer],
            });
        }
    };
}
