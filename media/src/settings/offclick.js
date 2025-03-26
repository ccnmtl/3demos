export const offclick = (node) => {
    const handleclick = (e) => {
        if (!node.contains(e.target)) {
            // console.log("offclick handled", e);
            e.stopImmediatePropagation();
            node.dispatchEvent(new CustomEvent('offclick'));
        }
    };

    document.addEventListener('click', handleclick, true);
    return {
        destroy: () => {
            document.removeEventListener('click', handleclick, true);
        }
    };
};