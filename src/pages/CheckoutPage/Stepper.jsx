/**
 * Horizontal wizard stepper: numbered circles with done ✓ / active / upcoming
 * states and connector lines. Completed steps are buttons — the server FSM
 * legally re-enters earlier states (edit address / change shipping), so going
 * back is allowed; upcoming steps are not clickable.
 */
export default function Stepper({ labels, current, onStepClick, disabled }) {
    return (
        <ol className="stepper" aria-label="Checkout progress">
            {labels.map((label, i) => {
                const stepNo = i + 1;
                const state = stepNo === current ? 'active' : stepNo < current ? 'done' : '';
                const clickable = state === 'done' && !disabled;
                return (
                    <li key={label} className={state}>
                        <button
                            type="button"
                            className="step-node"
                            aria-current={stepNo === current ? 'step' : undefined}
                            disabled={!clickable}
                            onClick={clickable ? () => onStepClick(stepNo) : undefined}
                        >
                            <span className="step-circle" aria-hidden="true">
                                {state === 'done' ? '✓' : stepNo}
                            </span>
                            <span>{label}</span>
                        </button>
                        {stepNo < labels.length && <span className="connector" aria-hidden="true" />}
                    </li>
                );
            })}
        </ol>
    );
}
