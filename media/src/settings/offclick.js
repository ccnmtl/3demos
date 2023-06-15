export const offclick = (node) => {
    const handleclick = (e) => {
        if (!node.contains(e.target)) {
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